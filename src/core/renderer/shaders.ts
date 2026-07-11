/**
 * Vertex shader — просто передаёт координаты
 */
export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

/**
 * Fragment shader — применяет коэффициенты коррекции
 */
export const FRAGMENT_SHADER = `
  precision highp float;
  
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_color;
  
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // 1. Применяем яркость
    color.rgb *= u_brightness;
    
    // 2. Применяем контраст
    // Контраст: (color - 0.5) * contrast + 0.5
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    
    // 3. Применяем насыщенность (цветность)
    // luminance = 0.299*R + 0.587*G + 0.114*B
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(luminance), color.rgb, u_color);
    
    // Ограничиваем значения [0, 1]
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    
    gl_FragColor = color;
  }
`;