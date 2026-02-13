/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantenemos tu configuración actual
  typescript: {
    ignoreBuildErrors: true,
  },

  // Añadimos la configuración para despliegue estático
  output: 'export',
  images: {
    unoptimized: true,
  },

  /* * Si tu URL será: https://<usuario>.github.io/<nombre-repo>/
   * Descomenta la línea de abajo y pon el nombre de tu repo:
   */
  // basePath: '/3d-stability-checker', 
}

export default nextConfig