/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client loads a native binding (@libsql/linux-x64-gnu et al.) when
  // it opens a local file: database. Bundling it breaks that resolution, so
  // leave it external and let Node require it at runtime.
  serverExternalPackages: ["xlsx", "@libsql/client", "libsql"],
};

export default nextConfig;
