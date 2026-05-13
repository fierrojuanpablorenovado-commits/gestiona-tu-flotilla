import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

interface ParsedEarning {
  driverName: string;
  driverPlatformId?: string;
  earningDate: Date;
  totalTrips: number;
  grossFares: number;
  tips: number;
  promotions: number;
  platformCommission: number;
  isrRetention: number;
  ivaRetention: number;
  totalDeductions: number;
  netEarnings: number;
  cashCollected: number;
  digitalEarnings: number;
}

@Injectable()
export class ConciliationService {
  private readonly logger = new Logger(ConciliationService.name);

  /**
   * Parse Didi Fleet Excel export into structured earnings data.
   * Didi sends Excel files via email with weekly earnings breakdown.
   */
  async parseDidiExcel(buffer: Buffer): Promise<ParsedEarning[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

    if (!rawData.length) {
      throw new BadRequestException('El archivo Excel de Didi esta vacio');
    }

    this.logger.log(`Parsing Didi Excel: ${rawData.length} rows found`);

    // Map Didi columns to our structure
    // Column names vary by export version, so we try multiple mappings
    const earnings: ParsedEarning[] = rawData.map((row: any) => {
      const driverName =
        row['Nombre del conductor'] ||
        row['Driver Name'] ||
        row['Conductor'] ||
        '';

      const grossFares =
        this.parseNumber(row['Ingreso bruto']) ||
        this.parseNumber(row['Gross Income']) ||
        this.parseNumber(row['Total viajes']) ||
        0;

      const commission =
        this.parseNumber(row['Comision DiDi']) ||
        this.parseNumber(row['Comision']) ||
        this.parseNumber(row['Service Fee']) ||
        0;

      const isr =
        this.parseNumber(row['Retencion ISR']) ||
        this.parseNumber(row['ISR']) ||
        0;

      const iva =
        this.parseNumber(row['Retencion IVA']) ||
        this.parseNumber(row['IVA']) ||
        0;

      const tips =
        this.parseNumber(row['Propinas']) ||
        this.parseNumber(row['Tips']) ||
        0;

      const promotions =
        this.parseNumber(row['Recompensas']) ||
        this.parseNumber(row['Bonos']) ||
        this.parseNumber(row['Promotions']) ||
        0;

      const cash =
        this.parseNumber(row['Efectivo']) ||
        this.parseNumber(row['Cash']) ||
        0;

      const totalDeductions = Math.abs(commission) + Math.abs(isr) + Math.abs(iva);
      const netEarnings = grossFares + tips + promotions - totalDeductions;

      return {
        driverName,
        driverPlatformId: row['ID Conductor'] || row['Driver ID'] || undefined,
        earningDate: this.parseDate(row['Fecha'] || row['Date']),
        totalTrips: this.parseNumber(row['Viajes'] || row['Trips'] || row['Total Viajes']) || 0,
        grossFares,
        tips,
        promotions,
        platformCommission: Math.abs(commission),
        isrRetention: Math.abs(isr),
        ivaRetention: Math.abs(iva),
        totalDeductions,
        netEarnings,
        cashCollected: cash,
        digitalEarnings: netEarnings - cash,
      };
    });

    return earnings.filter((e) => e.driverName && e.grossFares > 0);
  }

  /**
   * Parse Uber Fleet CSV/Excel export into structured earnings data.
   * Can also be called with data from Uber API.
   */
  async parseUberExcel(buffer: Buffer): Promise<ParsedEarning[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

    if (!rawData.length) {
      throw new BadRequestException('El archivo de Uber esta vacio');
    }

    this.logger.log(`Parsing Uber export: ${rawData.length} rows found`);

    const earnings: ParsedEarning[] = rawData.map((row: any) => {
      const driverName =
        row['Driver'] ||
        row['Nombre'] ||
        row['Driver Name'] ||
        `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();

      const grossFares =
        this.parseNumber(row['Total Earnings']) ||
        this.parseNumber(row['Gross Earnings']) ||
        this.parseNumber(row['Fare']) ||
        0;

      const serviceFee =
        this.parseNumber(row['Service Fee']) ||
        this.parseNumber(row['Uber Fee']) ||
        this.parseNumber(row['Comision']) ||
        0;

      const bookingFee =
        this.parseNumber(row['Booking Fee']) ||
        0;

      const isr =
        this.parseNumber(row['ISR']) ||
        this.parseNumber(row['Tax Withholding']) ||
        0;

      const iva =
        this.parseNumber(row['IVA']) ||
        this.parseNumber(row['VAT']) ||
        0;

      const tips =
        this.parseNumber(row['Tips']) ||
        this.parseNumber(row['Propinas']) ||
        0;

      const promotions =
        this.parseNumber(row['Promotions']) ||
        this.parseNumber(row['Quest']) ||
        this.parseNumber(row['Surge']) ||
        0;

      const cash =
        this.parseNumber(row['Cash Trips']) ||
        this.parseNumber(row['Cash Collected']) ||
        this.parseNumber(row['Efectivo']) ||
        0;

      const totalDeductions = Math.abs(serviceFee) + Math.abs(bookingFee) + Math.abs(isr) + Math.abs(iva);
      const netEarnings = grossFares + tips + promotions - totalDeductions;

      return {
        driverName,
        driverPlatformId: row['Driver UUID'] || row['Driver ID'] || undefined,
        earningDate: this.parseDate(row['Date'] || row['Fecha'] || row['Trip Date']),
        totalTrips: this.parseNumber(row['Trips'] || row['Viajes'] || row['Trip Count']) || 0,
        grossFares,
        tips,
        promotions,
        platformCommission: Math.abs(serviceFee) + Math.abs(bookingFee),
        isrRetention: Math.abs(isr),
        ivaRetention: Math.abs(iva),
        totalDeductions,
        netEarnings,
        cashCollected: cash,
        digitalEarnings: netEarnings - cash,
      };
    });

    return earnings.filter((e) => e.driverName && e.grossFares > 0);
  }

  /**
   * Generate weekly conciliation for a specific driver.
   * Combines platform earnings with fleet charges.
   */
  async generateWeeklyConciliation(
    tenantId: string,
    driverId: string,
    weekStart: Date,
    weekEnd: Date,
  ) {
    // TODO: Implement with TypeORM queries
    // 1. Aggregate platform_earnings for this driver and period
    // 2. Get contract terms (weekly rent, etc.)
    // 3. Get any pending charges (damages, late fees, deposit installments)
    // 4. Calculate balance
    // 5. Create or update weekly_conciliations record
    // 6. Return the conciliation summary

    this.logger.log(
      `Generating conciliation for driver ${driverId}, week ${weekStart.toISOString()}`,
    );

    return {
      driverId,
      weekStart,
      weekEnd,
      status: 'draft',
      message: 'Conciliation generated - pending review',
    };
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$\s]/g, '').replace(/\((.+)\)/, '-$1');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseDate(value: any): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel serial date
      return new Date((value - 25569) * 86400 * 1000);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  }
}
