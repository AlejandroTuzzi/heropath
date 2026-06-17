/*
  Warnings:

  - You are about to drop the column `aspirationId` on the `Goal` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_aspirationId_fkey";

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "aspirationId",
ADD COLUMN     "aiAdvice" TEXT,
ADD COLUMN     "aspirationLink" TEXT;

-- CreateTable
CREATE TABLE "_GoalAspirations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GoalAspirations_AB_unique" ON "_GoalAspirations"("A", "B");

-- CreateIndex
CREATE INDEX "_GoalAspirations_B_index" ON "_GoalAspirations"("B");

-- AddForeignKey
ALTER TABLE "_GoalAspirations" ADD CONSTRAINT "_GoalAspirations_A_fkey" FOREIGN KEY ("A") REFERENCES "Aspiration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalAspirations" ADD CONSTRAINT "_GoalAspirations_B_fkey" FOREIGN KEY ("B") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
