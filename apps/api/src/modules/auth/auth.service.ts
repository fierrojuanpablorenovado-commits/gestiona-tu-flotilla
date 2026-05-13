import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates a user's email and password against stored credentials.
   * Returns the user (without password) if valid, null otherwise.
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Strip sensitive fields before returning
    const { passwordHash, refreshTokenHash, ...result } = user as User & {
      passwordHash: string;
      refreshTokenHash: string | null;
    };
    return result as User;
  }

  /**
   * Authenticates a user and returns JWT tokens.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Registers a new user. Only admins should call this (enforced at controller level).
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists for this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), tenantId: dto.tenantId },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists in this organization');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      tenantId: dto.tenantId,
      phone: dto.phone ?? null,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    const tokens = await this.generateTokens(savedUser);
    await this.storeRefreshToken(savedUser.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        tenantId: savedUser.tenantId,
      },
    };
  }

  /**
   * Generates a new access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: payload.sub })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify the refresh token matches what is stored
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('No active session. Please log in again.');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Returns the profile for the given user ID.
   */
  async getProfile(userId: string): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Invalidates the refresh token for a user, effectively logging them out.
   */
  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Generates an access token and a refresh token pair.
   */
  private async generateTokens(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string; expiresIn: number }> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.role === 'super_admin',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '24h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiresIn: 86400, // 24 hours in seconds
    };
  }

  /**
   * Hashes and stores the refresh token for the given user.
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }
}
