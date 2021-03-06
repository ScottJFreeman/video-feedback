/**
 * Ray tracing shader
 * 
 * This renders a texture representing iteration depth in 3d.
 */

RayTracingShader = (function() {

	return {

		defines: {
			MAX_DEPTH : 30,
			MAX_ITERATIONS : 30,
			FOG_FACTOR : .05,
			WRAP_PORTAL : 0,
		},

		uniforms: {
			tDiffuse : { type: "t", value: null },
			inverseViewMatrix : { type: "m4", value: new THREE.Matrix4() },
			inverseProjectionMatrix : { type: "m4", value: new THREE.Matrix4() },
			portalWidthHeight : { type: "v2", value: new THREE.Vector2() },
			layerColors : { type: "t", value: null },
			layerColorsSize : { type: "1f", value: 1 },			
			layerZ : { type: "t", value: null },
			layerZSize : { type: "1f", value: 1 },
			layerTop : { type: "1i", value: -1 },
			fogColor : { type: "v3", value: new THREE.Vector3(0.5, 0.6, 0.7) },
		},

		vertexShader: `

attribute vec2 ndcPositionAttribute;

varying vec2 ndcPosition;

void main() {
	ndcPosition = ndcPositionAttribute;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

`,

		fragmentShader: `

precision highp float;

uniform mat4 inverseViewMatrix;
uniform mat4 inverseProjectionMatrix;
uniform sampler2D tDiffuse;
uniform vec2 portalWidthHeight;

uniform sampler2D layerColors;
uniform float layerColorsSize;
uniform vec3 fogColor;

uniform sampler2D layerZ;
uniform float layerZSize;
uniform int layerTop;

varying vec2 ndcPosition;

/** Convert a depth value to a color. depth is in the inverval [-1, inf) */
vec4 getColorFromDepth(int depth) {
	return texture2D(
		layerColors, 
		vec2(clamp((float(depth + 1) + 0.5) / layerColorsSize, 0.0, 1.0), 0.0));
}

/** Get the depth of the feedback pattern according to the texture */
float getTextureDepth(vec2 st) {
	vec4 color = texture2D(tDiffuse, fract(st));
	return color.r * 256.0;
}

/** Convert xy feedback space coords to st texture space coords. */
vec2 toTextureSpace(vec2 feedbackSpacePosition) {
	return feedbackSpacePosition / portalWidthHeight + 0.5;
}

/** 
 * Return the confidence in [0, 1] that the given xy position in feedback space
 * corresponds to the given depth. The confidence should be monotonically 
 * increasing with depth.
 */
float getDepthConfidence(vec2 position, int depth) {
	position = toTextureSpace(position);
	#if WRAP_PORTAL
	return 1.0 - clamp(getTextureDepth(position) - float(depth), 0.0, 1.0);
	#else
	if (position.s < 0.0 
			|| position.s > 1.0 
			|| position.t < 0.0 
			|| position.t > 1.0) {
		return 1.0;
	} else {
		return 1.0 - clamp(getTextureDepth(position) - float(depth), 0.0, 1.0);
	}
	#endif
}

/** Return the z-coord (in feedback-space) of the layer at the given depth. */
float getLayerZ(int depth) {
	vec4 layerCoords = texture2D(
		layerZ, 
		vec2(clamp((float(depth + 1) + 0.5) / layerZSize, 0.0, 1.0), 0.0));
	// First component holds the z coordinate.
	return layerCoords.x;
}

/**
 * Returns feedback-space intersection of a ray with the feedback pattern.
 * 
 * The algorithm loops through layers from start to end. When an intersection
 * between the ray and a layer is found, the intersection coordinates and 
 * layer depth are returned in layer and intersection. If the loop terminates
 * without finding an intersection, the last checked layer is treated as though
 * it intersected the ray. This occurs if the end layer is reached without 
 * finding an intersection or the loop exceeds MAX_ITERATIONS iterations 
 * without finding an intersection.
 * 
 * in eye point on ray in feedback-space
 * in dir normalized direction of ray in feedback-space
 * in start depth of the first layer to test for intersection
 * in end one after the last layer depth to test for intersection
 * out layer holds the depth of the layer the ray intersected with
 * out intersection holds the feedback-space location of the intersection of 
 * 	the ray with the feedback pattern. 
 */
void getLayerIntersection(
		vec3 eye, 
		vec3 dir, 
		int start, 
		int end, 
		out int layer, 
		out vec3 intersection) {
	intersection = vec3(0, 0, 0);
	layer = start;
	int increment = int(sign(float(end) - float(start)));
	vec2 dxydz = dir.xy / dir.z;
	for (int i = 0; i <= MAX_ITERATIONS + 1; i++) {
		intersection.z = getLayerZ(layer);
		intersection.xy = eye.xy + dxydz * (intersection.z - eye.z);
		
		if (layer == end 
				|| i == MAX_ITERATIONS 
				|| getDepthConfidence(intersection.xy, layer) > 0.5) {
			return;
		} else {
			layer += increment;
		}
	}
}

void intersectFeedback(
		vec3 eye,
		vec3 dir,
		out int layerDepth,
		out vec3 intersection) {
	int start;
	int end;
	float dirz = sign(dir.z);
	if (dirz == 1.0) {
		start = layerTop;
		end = -1;
	} else if (dirz == -1.0) { 
		start = layerTop + 1;
		end = MAX_DEPTH + 1;
	} else { // dirz == 0.0 
		start = 0;
		end = 0;
	}
	getLayerIntersection(eye, dir, start, end, layerDepth, intersection);
}

vec4 applyFog(vec4 color, float distance) {
	float fogAmount = 1.0 - exp(-distance * FOG_FACTOR);
    return mix(color, vec4(fogColor, 1.0), fogAmount);
}

void main() {
	// Express ray in NDC space using homogeneous coordinates
	vec4 p1 = vec4(ndcPosition, -1.0, 1.0);
	vec4 p2 = vec4(ndcPosition, 1.0, 1.0);

	// Transform ray to view space.
	// http://feepingcreature.github.io/math.html
	p1 = inverseProjectionMatrix * p1;
	p2 = inverseProjectionMatrix * p2;
	p1 = p1 / p1.w;
	p2 = p2 / p2.w;

	// Transform ray to world space (== feedback space)
	p1 = inverseViewMatrix * p1;
	p2 = inverseViewMatrix * p2;

	// Express ray as a point + direction
	vec3 eye = p1.xyz;
	vec3 dir = normalize(p2.xyz - p1.xyz);
	
	vec3 intersection;
	int layerDepth;

	intersectFeedback(eye, dir, layerDepth, intersection);

	#if WRAP_PORTAL
	gl_FragColor = applyFog(getColorFromDepth(layerDepth), length(intersection.xy - eye.xy));
	#else
	gl_FragColor = applyFog(getColorFromDepth(layerDepth), length(intersection.xy));
	#endif
} 

`};
})();