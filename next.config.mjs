/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // pg se usa directo en el servidor; no lo empaquetes.
  serverExternalPackages: ["pg"],
  experimental: {
    // Importar progreso (JSON) puede pesar más que el límite por defecto de 1 MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
