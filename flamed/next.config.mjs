/** @type {import('next').NextConfig} */
const nextConfig = {
    //Bæti við tripadvisor media og unsplash sem trusted domain fyrir myndir
    images: {
        domains: ['dynamic-media-cdn.tripadvisor.com', 'images.unsplash.com'],
    },
};

export default nextConfig;
