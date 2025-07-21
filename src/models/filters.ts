import { Filter, FilterWithShader } from "pixi.js";

export class Functions extends Filter {
  constructor(red: string, green: string, blue: string) {
    super({});
  }
}

//   `
//     precision highp float;
//     varying vec2 vTextureCoord;
//     uniform sampler2D uSampler;
//     uniform float uRed;
//     uniform float uGreen;
//     uniform float uBlue;
//     uniform float uAlpha;

//     const float SRGB_ALPHA = 0.055;

//     float sec(float x) {
//     return 1.0 / cos(x);
//     }

//     float csc(float x) {
//     return 1.0 / sin(x);
//     }

//     float cot(float x) {
//     return 1.0 / tan(x);
//     }

//     float curveFunctionR(float r, float g, float b){
//         return ${red};
//     }

//     float curveFunctionG(float r, float g, float b){
//         return ${green};
//     }

//     float curveFunctionB(float r, float g, float b){
//         return ${blue};
//     }

//     vec3 rgb_to_xyz(vec3 rgb) {
//     // Define transformation matrix from RGB to XYZ
//     mat3 RGB_to_XYZ = mat3(
//     0.4124564, 0.2126729, 0.0193339,
//     0.3575761, 0.7151522, 0.1191920,
//     0.1804375, 0.0721750, 0.9503041
// );

//     // Convert RGB to XYZ
//     return RGB_to_XYZ * rgb;
//   }

//   vec3 XYZ_to_RGB(vec3 XYZ) {
//     mat3 inverse_transformation_matrix = mat3(
//      3.2404542,-0.9692660, 0.0556434,
//     -1.5371385, 1.8760108,-0.2040259,
//     -0.4985314, 0.0415560, 1.0572252
// );
//     vec3 linearRGB = inverse_transformation_matrix * XYZ;
//     return linearRGB;
// }

// // Return value of any base logarithm
// float log_b(float base, float x){
//   return log(x) / log(base);
// }

// // Converts a single linear channel to srgb
// float linear_to_srgb(float channel) {
//     if(channel <= 0.0031308)
//         return 12.92 * channel;
//     else
//         return (1.0 + SRGB_ALPHA) * pow(channel, 1.0/2.4) - SRGB_ALPHA;
// }

//   // Converts a single srgb channel to rgb
// float srgb_to_linear(float channel) {
//     if (channel <= 0.04045)
//         return channel / 12.92;
//     else
//         return pow((channel + SRGB_ALPHA) / (1.0 + SRGB_ALPHA), 2.4);
// }

//     void main() {
//         // Sample the texture
//         vec4 color = texture2D(uSampler, vTextureCoord);

//         // Get the x-coordinate of the current pixel

//         vec3 linearRGB = vec3(srgb_to_linear(color.r), srgb_to_linear(color.g), srgb_to_linear(color.b));

//         vec3 newColor = vec3(clamp(curveFunctionR(color.r,color.g,color.b),0.0,1.0), clamp(curveFunctionG(color.r,color.g,color.b),0.0,1.0), clamp(curveFunctionB(color.r,color.g,color.b),0.0,1.0));

//         gl_FragColor = vec4(newColor, color.a);
//     }
//     `;
