'use client';
import { useEffect, useState } from "react";

interface Room {
  id: number;
  title: string;
  content: string;
}
export default function Home() {
  const [ rooms, setRooms ] = useState<Room[]>([]);
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("api/posts/");
        const rooms = await res.json();
        setRooms(rooms);
        console.log("Fetched rooms:", rooms);
      }
      catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    fetchRooms();
  }, []);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Twoj Kwadrat</h1>
      {Array.isArray(rooms) && rooms.length > 0 ? (
        <ul>
        {rooms.map((room, index) => (
          <li key={index} className="p-4 border-b">
            <h2 className="text-2xl font-semibold">{room.title}</h2>
            <p>{room.content}</p>
          </li>
        ))}
      </ul>
      ) : (
        <p className="text-lg">No rooms available.</p>
      )}
    </main>
  );
}


