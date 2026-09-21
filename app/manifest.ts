import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Açaí do Bigode",
    short_name: "Açaí do Bigode",
    description: "Açaí que faz o bigode sorrir",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF3E7",
    theme_color: "#3B1364",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
