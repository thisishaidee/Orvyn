// Minimal typing for the one function we use from `qrcode` (already installed with ConnectKit).
declare module 'qrcode' {
  interface QRCodeOptions {
    margin?: number
    width?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: { dark?: string; light?: string }
  }
  const QRCode: {
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>
  }
  export default QRCode
}
