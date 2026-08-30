import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const admin = await auth.api.signUpEmail({
      body: {
        email: "admin@coffee.com",
        password: "password123",
        name: "Super Admin",
        role: "ADMIN"
      }
    });
    
    const cashier = await auth.api.signUpEmail({
      body: {
        email: "kasir@coffee.com",
        password: "password123",
        name: "Kasir Shift Pagi",
        role: "CASHIER"
      }
    });

    return NextResponse.json({ success: true, admin, cashier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
