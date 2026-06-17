-- CreateTable
CREATE TABLE "Influence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluenceMessage" (
    "id" TEXT NOT NULL,
    "influenceId" TEXT NOT NULL,
    "goalId" TEXT,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "usedAt" TIMESTAMP(3),
    "timesShown" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluenceMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Influence" ADD CONSTRAINT "Influence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluenceMessage" ADD CONSTRAINT "InfluenceMessage_influenceId_fkey" FOREIGN KEY ("influenceId") REFERENCES "Influence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
