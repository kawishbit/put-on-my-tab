import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Put On My Tab",
    short_name: "putonmytab",
    description:
      "Simple financial app to manage the tabs of people in your life (e.g roommates, friends, family members). You sort of become the bank for the people around you. They can deposit and withdraw from you. ",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
  };
}
