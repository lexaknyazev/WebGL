
/*
Copyright (c) 2019 The Khronos Group Inc.
Use of this source code is governed by an MIT-style license that can be
found in the LICENSE.txt file.
*/


attribute vec4 gtf_Vertex;
uniform mat4 gtf_ModelViewProjectionMatrix;
varying vec4 color;

void main (void)
{
	vec3 b = vec3(13.0, 53.0, 139.0);
	vec4 a = vec4(b, 217.0);
	float gray;
	if( (a[0] == 13.0) && (a[1] == 53.0) && (a[2] == 139.0) && (a[3] == 217.0))
	gray=1.0;
	else gray=0.0;
	color = vec4(gray, gray, gray, 1.0);
	gl_Position = gtf_ModelViewProjectionMatrix * gtf_Vertex;
}
