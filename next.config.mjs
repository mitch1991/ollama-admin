import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath && !rawBasePath.startsWith("/") ? `/${rawBasePath}` : rawBasePath;
const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: normalizedBasePath || undefined,
  assetPrefix: normalizedBasePath || undefined,
};

export default withNextIntl(nextConfig);
