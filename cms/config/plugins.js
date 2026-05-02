module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: env('CLOUDINARY_NAME') ? 'cloudinary' : 'local',
      ...(env('CLOUDINARY_NAME') && {
        providerOptions: {
          cloud_name: env('CLOUDINARY_NAME'),
          api_key: env('CLOUDINARY_KEY'),
          api_secret: env('CLOUDINARY_SECRET'),
        },
      }),
    },
  },
})
