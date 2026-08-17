import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const FONTE_ASSINATURA = "GreatVibes";

Font.register({
  family: FONTE_ASSINATURA,
  src: path.join(process.cwd(), "public", "fonts", "GreatVibes-Regular.ttf"),
});
