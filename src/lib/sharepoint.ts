import "server-only";

// Planilhas completas geradas pelo lr-indicadores-elabore, lidas da pasta data/outputs
// sincronizada no SharePoint (site /anl, biblioteca "Departamento Analytics") via Microsoft Graph.

const GRAPH = "https://graph.microsoft.com/v1.0";

export const FULL_SHEETS = {
  monthly: { folder: "monthly", suffix: "_indicadores_mensais.xlsx", label: "Indicadores Mensais" },
  annual: { folder: "annual", suffix: "_indicadores_anuais.xlsx", label: "Indicadores Anuais" },
  forrageira: { folder: "forrageira", suffix: "_base_custo_forrageira.xlsx", label: "Custo de Forrageira" },
} as const;

export type FullSheetKind = keyof typeof FULL_SHEETS;

// Nome gerado pelo notebook: AAAA_MM_DD_HHMMSS_<sufixo>.xlsx
const GENERATED_NAME = /^\d{4}_\d{2}_\d{2}_\d{6}_/;

let tokenCache: { token: string; expiresAt: number } | null = null;
let driveIdCache: string | null = null;

function config() {
  const tenant = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const secret = process.env.CLIENT_SECRET;
  const host = process.env.SHAREPOINT_HOSTNAME;
  if (!tenant || !clientId || !secret || !host) {
    throw new Error("Credenciais do SharePoint ausentes no .env.local (TENANT_ID, CLIENT_ID, CLIENT_SECRET, SHAREPOINT_HOSTNAME).");
  }
  return {
    tenant,
    clientId,
    secret,
    host,
    sitePath: process.env.SHAREPOINT_OUTPUTS_SITE ?? "/anl",
    driveName: process.env.SHAREPOINT_OUTPUTS_DRIVE ?? "Departamento Analytics",
    folder:
      process.env.SHAREPOINT_OUTPUTS_PATH ??
      "FERRAMENTAS/ELABORE/ELABORE_NOVO_SISTEMA/ANALISE_INDICADORES/lr-indicadores-elabore/data/outputs",
  };
}

async function graphToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const c = config();
  const res = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.secret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
    cache: "no-store",
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !body.access_token) throw new Error(`Falha ao autenticar no Microsoft Graph (${res.status}).`);
  tokenCache = { token: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 3600) - 300) * 1000 };
  return body.access_token;
}

async function graphGet<T>(path: string): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${await graphToken()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Microsoft Graph ${res.status} em ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

async function driveId(): Promise<string> {
  if (driveIdCache) return driveIdCache;
  const c = config();
  const site = await graphGet<{ id: string }>(`/sites/${c.host}:${c.sitePath}`);
  const drives = await graphGet<{ value: { id: string; name: string }[] }>(`/sites/${site.id}/drives`);
  const drive = drives.value.find((d) => d.name === c.driveName);
  if (!drive) throw new Error(`Biblioteca "${c.driveName}" não encontrada no SharePoint.`);
  driveIdCache = drive.id;
  return drive.id;
}

/** Arquivo mais recente da pasta de saída (pelo carimbo de data no nome) e a URL temporária de download. */
export async function latestFullSheet(kind: FullSheetKind): Promise<{ name: string; size: number; downloadUrl: string }> {
  const sheet = FULL_SHEETS[kind];
  const c = config();
  const path = encodeURI(`${c.folder}/${sheet.folder}`);
  const list = await graphGet<{
    value: { name: string; size: number; "@microsoft.graph.downloadUrl"?: string }[];
  }>(`/drives/${await driveId()}/root:/${path}:/children?$top=200`);
  const file = list.value
    .filter((f) => GENERATED_NAME.test(f.name) && f.name.endsWith(sheet.suffix))
    .sort((a, b) => b.name.localeCompare(a.name))[0];
  if (!file?.["@microsoft.graph.downloadUrl"]) {
    throw new Error(`Nenhuma planilha de ${sheet.label} encontrada no SharePoint.`);
  }
  return { name: file.name, size: file.size, downloadUrl: file["@microsoft.graph.downloadUrl"] };
}
