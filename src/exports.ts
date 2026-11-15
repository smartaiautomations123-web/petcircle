export type ExportDocument = {
  title: string;
  subtitle?: string;
  photo?: { uri: string; alt: string };
  sections: { heading: string; lines: string[] }[];
};

const htmlCharacters: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlCharacters[character]);
}

export function printablePhoto(uri?: string): string | undefined {
  if (uri && uri.length <= 2_000_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri) && !/\s/.test(uri)) return uri;
  return undefined;
}

export function telephoneUri(rawNumber: string): string | undefined {
  const number = rawNumber.trim().replace(/^(\+\d{1,3})\s*\(0\)/, '$1').replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : undefined;
}

export function renderText(document: ExportDocument): string {
  return [
    document.title,
    ...(document.subtitle ? [document.subtitle] : []),
    ...document.sections.flatMap(({ heading, lines }) => ['', heading, ...lines]),
  ].join('\n');
}

export function renderDocument(document: ExportDocument): string {
  const photo = printablePhoto(document.photo?.uri);
  const sections = document.sections.map(({ heading, lines }) => `
    <section>
      <h2>${escapeHtml(heading)}</h2>
      ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
    </section>`).join('');
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(document.title)}</title>
<style>
  @page { margin: 19mm; }
  body { max-width: 680px; margin: 0 auto; padding: 24px; color: #22282c; font: 16px/1.5 system-ui, sans-serif; overflow-wrap: anywhere; }
  @media print { body { max-width: none; padding: 0; } }
  header { border-bottom: 2px solid #7563d5; padding-bottom: 16px; }
  h1 { margin: 4px 0; line-height: 1.14; font-size: 34px; }
  h2 { margin: 0 0 7px; font-size: 18px; }
  p { margin: 4px 0; white-space: pre-wrap; }
  section { margin-top: 20px; break-inside: avoid; }
  img { display: block; margin-top: 20px; width: auto; max-width: 100%; max-height: 92mm; object-fit: contain; border-radius: 8px; }
  .brand { color: #513bb4; font-size: 13px; font-weight: 750; }
</style>
</head>
<body>
  <header>
    <p class="brand">PetCircle</p>
    <h1>${escapeHtml(document.title)}</h1>
    ${document.subtitle ? `<p>${escapeHtml(document.subtitle)}</p>` : ''}
  </header>
  <main>${photo && document.photo ? `<img src="${photo}" alt="${escapeHtml(document.photo.alt)}">` : ''}${sections}</main>
</body>
</html>`;
}

export async function shareText(title: string, message: string): Promise<'shared' | 'copied' | 'dismissed'> {
  if (!hasBrowser()) {
    const { Share } = await import('react-native');
    const result = await Share.share({ title, message }, { dialogTitle: title, subject: title });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: message });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'dismissed';
      if (!navigator.clipboard) throw error;
    }
  }
  if (!navigator.clipboard) throw new Error('Sharing requires a secure browser connection. You can still print this document.');
  await navigator.clipboard.writeText(message);
  return 'copied';
}

export function shareDocument(document: ExportDocument) {
  return shareText(document.title, renderText(document));
}

function hasBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.open === 'function' && typeof window.document !== 'undefined';
}

export async function printDocument(document: ExportDocument): Promise<void> {
  const html = renderDocument(document);
  if (hasBrowser()) {
    const printWindow = window.open('', '_blank', 'popup,width=760,height=800');
    if (!printWindow) throw new Error('Allow pop-ups to open the printable document.');
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }
  const { printAsync } = await import('expo-print');
  try {
    await printAsync({ html });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_PRINT_INCOMPLETE') return;
    throw error;
  }
}

export async function sharePdf(document: ExportDocument): Promise<void> {
  if (hasBrowser()) {
    await printDocument(document);
    return;
  }
  const [print, sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
  if (!await sharing.isAvailableAsync()) {
    await printDocument(document);
    return;
  }
  const { uri } = await print.printToFileAsync({ html: renderDocument(document) });
  await sharing.shareAsync(uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle: document.title,
  });
}
