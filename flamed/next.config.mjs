/** @type {import('next').NextConfig} */
const nextConfig = {
    //Bæti við tripadvisor media sem trusted domain fyrir myndir
    images: {
        domains: ['dynamic-media-cdn.tripadvisor.com'],
    },
};

export default nextConfig;
