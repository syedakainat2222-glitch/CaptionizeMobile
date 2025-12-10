/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: true,
    webpack: (config, { isServer }) => {
        // Add a rule to handle .node files
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });

        return config;
    },
};

export default nextConfig;
