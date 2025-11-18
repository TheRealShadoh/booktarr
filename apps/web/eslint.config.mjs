import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "e2e/**",
      "src/tests/**",
    ],
  },
  ...nextConfig,
];

export default eslintConfig;
