import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const coffee = await prisma.category.upsert({
    where: {
      name: "Coffee",
    },
    update: {},
    create: {
      name: "Coffee",
    },
  });

  const nonCoffee = await prisma.category.upsert({
    where: {
      name: "Non Coffee",
    },
    update: {},
    create: {
      name: "Non Coffee",
    },
  });

  const food = await prisma.category.upsert({
    where: {
      name: "Food",
    },
    update: {},
    create: {
      name: "Food",
    },
  });

  const addOn = await prisma.category.upsert({
    where: {
      name: "Add On",
    },
    update: {},
    create: {
      name: "Add On",
    },
  });

  await prisma.product.createMany({
    data: [
      {
        name: "Americano",
        sku: "COF-001",
        price: 18000,
        categoryId: coffee.id,
      },
      {
        name: "Cafe Latte",
        sku: "COF-002",
        price: 22000,
        categoryId: coffee.id,
      },
      {
        name: "Cappuccino",
        sku: "COF-003",
        price: 22000,
        categoryId: coffee.id,
      },
      {
        name: "Matcha Latte",
        sku: "NCO-001",
        price: 24000,
        categoryId: nonCoffee.id,
      },
      {
        name: "Chocolate",
        sku: "NCO-002",
        price: 23000,
        categoryId: nonCoffee.id,
      },
      {
        name: "Croissant",
        sku: "FOO-001",
        price: 18000,
        categoryId: food.id,
      },
      {
        name: "French Fries",
        sku: "FOO-002",
        price: 20000,
        categoryId: food.id,
      },
      {
        name: "Extra Espresso",
        sku: "ADD-001",
        price: 8000,
        categoryId: addOn.id,
      },
      {
        name: "Oat Milk",
        sku: "ADD-002",
        price: 5000,
        categoryId: addOn.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed berhasil.");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });