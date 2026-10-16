import { supabase } from "@/lib/supabase";
import { Metadata } from "next";
import ClientPage from "./ClientPage";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await params to support both Next.js 14 and 15
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Fetch just the data we need for SEO
  const { data: listing } = await supabase
    .from("listings")
    .select("product_name, title, ai_description, description, sale_price, currency_code, image_url, image_urls")
    .eq("id", id)
    .single();

  const title = listing?.product_name || listing?.title || "Item for sale on ListPro";
  const description = listing?.ai_description || listing?.description || "Check out this amazing item on ListPro!";
  const price = listing?.sale_price ? `${listing.currency_code === 'NPR' ? 'Rs. ' : '$'}${listing.sale_price}` : "";
  
  const firstImage = listing?.image_url || (listing?.image_urls && listing.image_urls[0]);
  // Fallback image if no image exists
  const imageUrl = firstImage || "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=1200&q=80";

  return {
    title: `${title} - ${price} | ListPro`,
    description: description.substring(0, 150) + "...",
    openGraph: {
      title: `${title} - ${price}`,
      description: description.substring(0, 150) + "...",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - ${price}`,
      description: description.substring(0, 150) + "...",
      images: [imageUrl],
    },
  };
}

export default function ListingPage() {
  // This simply renders your interactive client component
  return <ClientPage />;
}