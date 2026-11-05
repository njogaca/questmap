/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // pg se usa directo en el servidor; no lo empaquetes.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
