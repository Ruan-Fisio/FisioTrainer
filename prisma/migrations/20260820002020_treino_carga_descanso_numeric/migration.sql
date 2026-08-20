-- AlterTable
ALTER TABLE "TreinoDiaExercicio" DROP COLUMN "carga",
ADD COLUMN     "carga" DECIMAL(6,2),
DROP COLUMN "descanso",
ADD COLUMN     "descanso" INTEGER;

