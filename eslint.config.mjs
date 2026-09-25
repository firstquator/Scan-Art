import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 브라우저 기본 대화상자 금지: 토스트(useToast)나 모달(useConfirm)을 쓴다.
      "no-alert": "error",
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "useToast()를 사용하세요." },
        { name: "confirm", message: "useConfirm()을 사용하세요." },
        { name: "prompt", message: "모달 입력 폼을 사용하세요." },
      ],
      // 이미지는 업로드 시점에 WebP 800/1600으로 미리 만들어 두므로 next/image 최적화를 쓰지 않는다.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts", ".data/**", "drizzle/**"]),
]);

export default eslintConfig;
