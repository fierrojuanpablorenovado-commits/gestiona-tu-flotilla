import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MessageDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly vehiclesService: VehiclesService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async chat(
    tenantId: string,
    message: string,
    history: MessageDto[] = [],
  ): Promise<{ response: string; suggestions: string[] }> {
    this.logger.log(`AI chat para tenant ${tenantId}: "${message.slice(0, 60)}..."`);

    const fleetContext = await this.buildFleetContext(tenantId);
    const systemPrompt = this.buildSystemPrompt(fleetContext);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    return {
      response: text,
      suggestions: this.getSuggestions(message),
    };
  }

  private async buildFleetContext(tenantId: string): Promise<string> {
    try {
      const stats = await this.vehiclesService.getDashboardStats(tenantId);
      const today = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const alertLines = stats.alerts
        .slice(0, 5)
        .map((a) => `  - [${a.severity.toUpperCase()}] ${a.vehicleLabel}: ${a.message}`)
        .join('\n');

      const brandLines = Object.entries(stats.byBrand)
        .map(([brand, count]) => `  ${brand}: ${count}`)
        .join('\n');

      return `
FECHA HOY: ${today}

RESUMEN DE FLOTA:
- Total vehículos: ${stats.totalVehicles}
- Activos: ${stats.byStatus.active}
- En mantenimiento: ${stats.byStatus.in_maintenance}
- Detenidos: ${stats.byStatus.stopped}
- Disponibles: ${stats.byStatus.available}
- Pérdida total: ${stats.byStatus.total_loss}

CONDUCTORES:
- Con conductor asignado: ${stats.withDriver}
- Sin conductor: ${stats.withoutDriver}

PROMEDIOS DE FLOTA:
- Kilometraje promedio: ${stats.averageOdometer.toLocaleString('es-MX')} km
- Edad promedio: ${stats.averageAge} años
- Valor total de flota: $${stats.totalFleetValue.toLocaleString('es-MX')} MXN

DISTRIBUCIÓN POR MARCA:
${brandLines || '  Sin datos'}

ALERTAS ACTIVAS (${stats.alerts.length} total):
${alertLines || '  Sin alertas activas'}
`.trim();
    } catch {
      return 'Datos de flota no disponibles en este momento.';
    }
  }

  private buildSystemPrompt(fleetContext: string): string {
    return `Eres el Asesor de Flota IA de "Gestiona tu Flotilla", una plataforma SaaS para administración de flotillas vehiculares en México.

Tu rol es actuar como un gerente de operaciones senior que conoce la flota del tenant en tiempo real. Eres directo, práctico y hablas en español mexicano de negocios.

DATOS EN TIEMPO REAL DE LA FLOTA:
${fleetContext}

CAPACIDADES:
- Analizar el estado actual de la flota y detectar problemas
- Generar reportes ejecutivos (brief diario, semanal, mensual)
- Redactar comunicados para conductores o socios
- Interpretar alertas y recomendar acciones concretas
- Calcular métricas de eficiencia y rentabilidad
- Responder preguntas operativas sobre la flota

COMANDOS RÁPIDOS (el usuario puede escribirlos):
- /brief → Resumen ejecutivo del estado actual de la flota
- /alertas → Lista de alertas críticas y qué hacer con cada una
- /reporte → Reporte semanal listo para enviar a socios
- /mantenimiento → Vehículos que necesitan servicio próximamente

REGLAS:
- Responde siempre en español, tono profesional pero directo
- Usa los datos reales de la flota en tus respuestas — nada genérico
- Si hay alertas críticas, mencionarlas primero
- Sé conciso: máximo 3 párrafos salvo que se pida un reporte completo
- Si el usuario pide un borrador de correo/comunicado, formatearlo listo para copiar
- NUNCA ejecutes acciones en el sistema — solo analiza, recomienda y redacta`;
  }

  private getSuggestions(message: string): string[] {
    const lower = message.toLowerCase();
    if (lower.includes('alert') || lower.includes('problema') || lower.includes('critico')) {
      return ['/alertas', '¿Qué hago con los seguros vencidos?', '¿Cuántos vehículos están detenidos?'];
    }
    if (lower.includes('reporte') || lower.includes('resumen') || lower.includes('brief')) {
      return ['/reporte', '¿Cuál es el valor total de mi flota?', '¿Qué vehículos rinden más?'];
    }
    if (lower.includes('mantenimiento') || lower.includes('servicio')) {
      return ['/mantenimiento', '¿Cuánto gasto en mantenimiento?', '¿Qué vehículos tienen servicio vencido?'];
    }
    return ['/brief', '/alertas', '/reporte', '/mantenimiento'];
  }
}
