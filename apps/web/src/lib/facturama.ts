import { cfdiDecrypt } from './cfdi-encrypt';

export interface CFDIConfig {
  rfc: string;
  razonSocial: string;
  codigoPostal: string;
  regimenFiscal: string;
  pacUser: string;
  pacPasswordEnc: string;
  pacSandbox: boolean;
  serieIngreso: string;
  serieGlobal: string;
}

export interface CFDIItem {
  descripcion: string;
  monto: number;
  cantidad?: number;
  claveProdServ?: string;
  claveUnidad?: string;
}

export interface FacturamaResult {
  id: string;
  uuid: string;
  serie?: string;
  folio?: string;
  error?: string;
}

function baseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://apisandbox.facturama.mx'
    : 'https://api.facturama.mx';
}

async function apiFetch<T>(
  config: CFDIConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data?: T; error?: string; status: number }> {
  const password = cfdiDecrypt(config.pacPasswordEnc);
  const creds = Buffer.from(`${config.pacUser}:${password}`).toString('base64');

  const res = await fetch(`${baseUrl(config.pacSandbox)}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    return { error: text, status: res.status };
  }

  const data = await res.json().catch(() => ({})) as T;
  return { data, status: res.status };
}

function buildItems(items: CFDIItem[]) {
  return items.map((item, i) => {
    const subtotal = parseFloat(((item.cantidad ?? 1) * item.monto).toFixed(2));
    const iva = parseFloat((subtotal * 0.16).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));
    return {
      ProductCode: item.claveProdServ ?? '78131600',
      IdentificationNumber: `ITEM${String(i + 1).padStart(3, '0')}`,
      Description: item.descripcion,
      Unit: item.claveUnidad ?? 'E48',
      UnitCode: item.claveUnidad ?? 'E48',
      Quantity: item.cantidad ?? 1,
      UnitPrice: item.monto,
      Subtotal: subtotal,
      TaxObject: '02',
      Taxes: [{ Total: iva, Name: 'IVA', Base: subtotal, Rate: 0.16, IsRetention: false }],
      Total: total,
    };
  });
}

interface FacturamaRaw {
  Id: string;
  Serie?: string;
  Folio?: string;
  Complement?: { TaxStamp?: { Uuid: string } };
}

export async function emitirCFDIIngreso(
  config: CFDIConfig,
  receptor: { rfc: string; nombre: string; usoCfdi: string; regimenFiscal: string; codigoPostal: string },
  items: CFDIItem[],
  folio?: number,
): Promise<FacturamaResult> {
  const builtItems = buildItems(items);
  const payload = {
    NameId: '1',
    Serie: config.serieIngreso,
    Folio: String(folio ?? Date.now()),
    PaymentForm: '99',
    PaymentMethod: 'PUE',
    Currency: 'MXN',
    CfdiType: 'I',
    Exportation: '01',
    ExpeditionPlace: config.codigoPostal,
    Issuer: { FiscalRegime: config.regimenFiscal, Rfc: config.rfc, Name: config.razonSocial },
    Receiver: {
      Rfc: receptor.rfc,
      Name: receptor.nombre,
      CfdiUse: receptor.usoCfdi,
      FiscalRegime: receptor.regimenFiscal,
      TaxZipCode: receptor.codigoPostal,
    },
    Items: builtItems,
  };

  const result = await apiFetch<FacturamaRaw>(config, 'POST', '/3/cfdis', payload);
  if (result.error || !result.data) {
    return { id: '', uuid: '', error: result.error ?? 'Error al timbrar' };
  }
  return {
    id: result.data.Id,
    uuid: result.data.Complement?.TaxStamp?.Uuid ?? '',
    serie: result.data.Serie,
    folio: result.data.Folio,
  };
}

export async function emitirCFDIGlobal(
  config: CFDIConfig,
  month: number,
  year: number,
  items: CFDIItem[],
  folio?: number,
): Promise<FacturamaResult> {
  const builtItems = buildItems(items);
  const payload = {
    NameId: '1',
    Serie: config.serieGlobal,
    Folio: String(folio ?? Date.now()),
    PaymentForm: '99',
    PaymentMethod: 'PUE',
    Currency: 'MXN',
    CfdiType: 'I',
    Exportation: '01',
    ExpeditionPlace: config.codigoPostal,
    GlobalInformation: {
      Periodicity: '04',
      Months: String(month).padStart(2, '0'),
      Year: String(year),
    },
    Issuer: { FiscalRegime: config.regimenFiscal, Rfc: config.rfc, Name: config.razonSocial },
    Receiver: {
      Rfc: 'XAXX010101000',
      Name: 'PÚBLICO EN GENERAL',
      CfdiUse: 'S01',
      FiscalRegime: '616',
      TaxZipCode: '99999',
    },
    Items: builtItems,
  };

  const result = await apiFetch<FacturamaRaw>(config, 'POST', '/3/cfdis', payload);
  if (result.error || !result.data) {
    return { id: '', uuid: '', error: result.error ?? 'Error al timbrar' };
  }
  return {
    id: result.data.Id,
    uuid: result.data.Complement?.TaxStamp?.Uuid ?? '',
    serie: result.data.Serie,
    folio: result.data.Folio,
  };
}

export async function cancelarCFDI(
  config: CFDIConfig,
  facturamaId: string,
  motivo: '01' | '02' | '03' | '04' = '02',
): Promise<{ ok: boolean; error?: string }> {
  const result = await apiFetch(
    config,
    'DELETE',
    `/3/cfdis/${facturamaId}?type=issued&motive=${motivo}`,
  );
  if (result.error) return { ok: false, error: result.error };
  return { ok: true };
}

export async function descargarArchivoCFDI(
  config: CFDIConfig,
  facturamaId: string,
  tipo: 'xml' | 'pdf',
): Promise<{ content: string; mimeType: string } | null> {
  const password = cfdiDecrypt(config.pacPasswordEnc);
  const creds = Buffer.from(`${config.pacUser}:${password}`).toString('base64');
  const url = `${baseUrl(config.pacSandbox)}/cfdi-files/${tipo}/${facturamaId}`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${creds}` } });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return {
    content: Buffer.from(buf).toString('base64'),
    mimeType: tipo === 'pdf' ? 'application/pdf' : 'application/xml',
  };
}

export async function probarConexionFacturama(
  config: CFDIConfig,
): Promise<{ ok: boolean; error?: string }> {
  const result = await apiFetch(config, 'GET', '/3/cfdis/issued');
  if (result.status === 200 || result.status === 204) return { ok: true };
  return { ok: false, error: result.error ?? `HTTP ${result.status}` };
}
