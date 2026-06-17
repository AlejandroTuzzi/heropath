-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "shortcomingLink" TEXT;

-- CreateTable
CREATE TABLE "Shortcoming" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "aiAdvice" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortcoming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GoalShortcomings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GoalShortcomings_AB_unique" ON "_GoalShortcomings"("A", "B");

-- CreateIndex
CREATE INDEX "_GoalShortcomings_B_index" ON "_GoalShortcomings"("B");

-- AddForeignKey
ALTER TABLE "Shortcoming" ADD CONSTRAINT "Shortcoming_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalShortcomings" ADD CONSTRAINT "_GoalShortcomings_A_fkey" FOREIGN KEY ("A") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalShortcomings" ADD CONSTRAINT "_GoalShortcomings_B_fkey" FOREIGN KEY ("B") REFERENCES "Shortcoming"("id") ON DELETE CASCADE ON UPDATE CASCADE;
