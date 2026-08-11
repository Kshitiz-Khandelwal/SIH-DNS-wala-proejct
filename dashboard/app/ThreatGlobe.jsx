'use client';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';

// The globe visualizes real blocked events. When GeoLite2 data is absent, deterministic
// display positions are used and explicitly labelled as unavailable in the dashboard.
function pointFor(event,index){
 const geo=event.geo_json||''; const lat=Number((geo.match(/latitude.?[:=] ?(-?\d+(\.\d+)?)/)||[])[1]); const lon=Number((geo.match(/longitude.?[:=] ?(-?\d+(\.\d+)?)/)||[])[1]);
 if(Number.isFinite(lat)&&Number.isFinite(lon))return [lat,lon]; return [((index*37)%120)-60,((index*71)%300)-150];
}
function vector(lat,lon,r=1.02){const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta))}
export default function ThreatGlobe({events}){
 const host=useRef(null);
 useEffect(()=>{const node=host.current;if(!node)return;const width=node.clientWidth||280,height=190;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,width/height,.1,100);camera.position.z=3.6;const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(width,height);renderer.setPixelRatio(Math.min(devicePixelRatio,2));node.appendChild(renderer.domElement);
 const globe=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),new THREE.MeshBasicMaterial({color:0x0c2c48,wireframe:true,transparent:true,opacity:.85}));scene.add(globe);const source=vector(20,78,1.03);scene.add(new THREE.Mesh(new THREE.SphereGeometry(.035,10,10),new THREE.MeshBasicMaterial({color:0x3ed8ff})).translateX(source.x).translateY(source.y).translateZ(source.z));
 events.filter(e=>e.verdict==='BLOCK').slice(0,24).forEach((event,index)=>{const [lat,lon]=pointFor(event,index),target=vector(lat,lon,1.03),mid=source.clone().add(target).multiplyScalar(.5).normalize().multiplyScalar(1.55),curve=new THREE.QuadraticBezierCurve3(source,mid,target),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),new THREE.LineBasicMaterial({color:0xff647c,transparent:true,opacity:.85}));scene.add(line);const dot=new THREE.Mesh(new THREE.SphereGeometry(.025,8,8),new THREE.MeshBasicMaterial({color:0xff647c}));dot.position.copy(target);scene.add(dot)});
 let frame;const animate=()=>{frame=requestAnimationFrame(animate);globe.rotation.y+=.003;scene.rotation.y+=.001;renderer.render(scene,camera)};animate();return()=>{cancelAnimationFrame(frame);renderer.dispose();node.removeChild(renderer.domElement)}},[events]);
 return <div className="three-globe" ref={host} aria-label="Live blocked DNS threat map"/>;
}
