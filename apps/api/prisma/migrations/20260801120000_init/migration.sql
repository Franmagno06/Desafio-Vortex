-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('LIVROS', 'ENGENHARIA', 'COMPUTACAO', 'ELETRONICOS', 'VESTUARIO', 'MOVEIS', 'PAPELARIA', 'OUTROS');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('VENDA', 'DOACAO', 'TROCA');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NOVO', 'SEMINOVO', 'USADO');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('ATIVO', 'RESERVADO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "passwordHash" VARCHAR(120) NOT NULL,
    "course" VARCHAR(120),
    "campus" VARCHAR(120),
    "avatarUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "type" "ItemType" NOT NULL,
    "priceCents" INTEGER,
    "imageUrl" VARCHAR(500) NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'ATIVO',
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "announcements_deletedAt_status_createdAt_idx" ON "announcements"("deletedAt", "status", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_deletedAt_category_idx" ON "announcements"("deletedAt", "category");

-- CreateIndex
CREATE INDEX "announcements_authorId_deletedAt_idx" ON "announcements"("authorId", "deletedAt");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
