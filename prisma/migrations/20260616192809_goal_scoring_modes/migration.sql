-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "strictness" TEXT NOT NULL DEFAULT 'strict',
ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
ADD COLUMN     "weeklyTarget" INTEGER,
ALTER COLUMN "score" SET DEFAULT 100,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
