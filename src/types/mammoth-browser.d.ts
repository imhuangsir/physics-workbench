declare module "mammoth/mammoth.browser.js" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
  interface DocImage { contentType: string; read(encoding: string): Promise<string>; }
  interface MammothImages { imgElement(fn: (image: DocImage) => Promise<{ [attr: string]: string }>): unknown; }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: { convertImage?: unknown }): Promise<{ value: string; messages: unknown[] }>;
  export const images: MammothImages;
  const _default: {
    extractRawText: typeof extractRawText;
    convertToHtml: typeof convertToHtml;
    images: MammothImages;
  };
  export default _default;
}
