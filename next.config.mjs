/** @type {import('next').NextConfig} */
const nextConfig = {
  // The floating dev badge sits on top of the bottom tab bar on a phone viewport.
  devIndicators: false,

  // This app uses no next/image, so the optimizer — and the optional `sharp`
  // binary Next pulls in for it — is never loaded. See LICENSES.md.
  images: { unoptimized: true },
};

export default nextConfig;
