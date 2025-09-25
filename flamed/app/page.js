//import path og promises, til þess að geta lesið skjöl async
import path from "path";
import { promises as fs } from "fs";
import Swiper from "../components/swiper";
import Image from "next/image";
import HomeClient from "../components/home-client";

export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <HomeClient />
    </main>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-bold mb-6">Restaurants</h1>
        <Swiper /> {/* Færði allt supabase fetching í swiper */}
      </div>
    </main>
  );
}