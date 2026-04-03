"use client";

import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useTracks, type TrackReference } from "@livekit/components-react";
import { Track, createAudioAnalyser, isAudioTrack } from "livekit-client";

// Feature flag: Set to true to use Simli avatar, false to use GLB 3D model
const USE_SIMLI_AVATAR = false;

// Import Simli component if enabled
const AvatarSimli = USE_SIMLI_AVATAR
  ? lazy(() => import("./avatar-simli").then((m) => ({ default: m.AvatarSimli })))
  : null;

declare global {
  interface Window {
    THREE: typeof import("three");
  }
}

const SPEAKING_SHAPES = ["viseme_aa", "viseme_O", "viseme_E", "viseme_CH", "viseme_nn"];
const NOISE_GATE = 5;
const BLINK_DURATION = 150;

interface Avatar3DProps {
  modelPath?: string;
  className?: string;
  isActive?: boolean;
}

function Avatar3DGLB({
  modelPath = "/male.glb",
  className = "",
  isActive = true,
}: Avatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sceneRef = useRef<import("three").Scene | null>(null);
  const cameraRef = useRef<import("three").PerspectiveCamera | null>(null);
  const rendererRef = useRef<import("three").WebGLRenderer | null>(null);
  const headMeshRef = useRef<import("three").Mesh | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const activeShapeIndexRef = useRef(0);
  const lastShapeSwapTimeRef = useRef(0);
  const isBlinkingRef = useRef(false);
  const blinkStartTimeRef = useRef(0);
  const nextBlinkTimeRef = useRef(Date.now() + 3000);
  const handleResizeRef = useRef<(() => void) | null>(null);
  const audioAnalyserCleanupRef = useRef<(() => Promise<void>) | null>(null);

  // FIX #1: Use refs to stabilize track references and prevent re-renders (flickering fix)
  const agentAudioTrackRef = useRef<TrackReference | null>(null);
  const agentTrackInitializedRef = useRef(false);
  
  // Subscribe to agent's microphone track for lip-sync
  const agentTracks = useTracks([Track.Source.Microphone]);
  const agentAudioTrack = agentTracks.find(track => track.participant.isAgent);
  
  // Store track in ref to avoid re-renders when track state changes
  useEffect(() => {
    if (agentAudioTrack && !agentTrackInitializedRef.current) {
      agentAudioTrackRef.current = agentAudioTrack;
      agentTrackInitializedRef.current = true;
      console.log('🎯 Agent audio track captured for lip-sync');
    }
  }, [agentAudioTrack]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    let mounted = true;

    const init = async () => {
      try {
        const THREE = window.THREE || (await import("three"));
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.86, 0.8); // Moved up 20% on Y axis (1.55 * 1.2 = 1.86)
        camera.lookAt(0, 1.5, 0); // Look at the avatar's neck/chest area
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.scale = "0.9";
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(1, 3, 2);
        scene.add(dirLight);

        const loader = new GLTFLoader();
        console.log('🎭 Loading model from:', modelPath);
        loader.load(
          modelPath,
          (gltf) => {
            if (!mounted) return;
            const model = gltf.scene;
            scene.add(model);
            
            console.log('✅ Model loaded successfully!');
            console.log('   Model children count:', model.children.length);
            console.log('   Model name:', model.name || 'unnamed');
            
            let meshCount = 0;
            let morphMeshCount = 0;
            
            model.traverse((child) => {
              const mesh = child as import("three").Mesh;
              // Use isMesh property (like in c.html) instead of type string
              if (mesh.isMesh) {
                meshCount++;
                const hasMorphs = !!mesh.morphTargetDictionary;
                console.log(`🔍 Mesh #${meshCount}:`, child.name, '- Has morph targets:', hasMorphs);
                
                if (hasMorphs) {
                  morphMeshCount++;
                  const morphDict = mesh.morphTargetDictionary!;
                  const shapeKeys = Object.keys(morphDict);
                  console.log('   Blendshape keys:', shapeKeys.slice(0, 10).join(', '), shapeKeys.length > 10 ? `... (${shapeKeys.length} total)` : '');
                  
                  if ("viseme_sil" in morphDict) {
                    headMeshRef.current = mesh;
                    console.log('✅✅✅ HEAD MESH FOUND! Setting as headMeshRef');
                    console.log('   Viseme shapes:', Object.keys(morphDict).filter(k => k.includes('viseme')).join(', '));
                    console.log('   Eye shapes:', Object.keys(morphDict).filter(k => k.includes('eye') || k.includes('blink')).join(', '));
                  }
                }
              }
            });
            
            console.log(`📊 Total meshes: ${meshCount}, Meshes with morphs: ${morphMeshCount}`);
            console.log('🎯 Head mesh ref set:', !!headMeshRef.current);

            setIsLoading(false);
            console.log('✨ Loading state set to false');
          },
          (progress) => {
            if (progress.total > 0) {
              const percent = (progress.loaded / progress.total) * 100;
              console.log(`📥 Loading model: ${percent.toFixed(1)}%`);
            }
          },
          (err) => {
            if (!mounted) return;
            console.error("❌ Error loading model:", err);
            setError("Failed to load avatar model: " + ((err as Error)?.message || 'Unknown error'));
            setIsLoading(false);
          }
        );

        const handleResize = () => {
          if (!cameraRef.current || !rendererRef.current) return;
          const w = container.clientWidth;
          const h = container.clientHeight;
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        };
        
        handleResizeRef.current = handleResize;
        window.addEventListener("resize", handleResize);

        async function initAudioFromAgentTrack() {
          // Use the ref instead of direct state (prevents re-renders)
          const trackRef = agentAudioTrackRef.current;
          
          if (!trackRef) {
            console.warn("Agent audio track not available yet, will retry...");
            // Retry after a short delay
            setTimeout(initAudioFromAgentTrack, 500);
            return;
          }
          
          try {
            console.log('🔊 Initializing audio from agent track...');
            
            // Get the actual RemoteAudioTrack from the TrackReference
            const remoteTrack = trackRef.publication?.track;
            
            if (!remoteTrack) {
              console.error("LiveKit track not found in publication");
              return;
            }
            
            // Type guard to ensure it's an audio track
            if (!isAudioTrack(remoteTrack)) {
              console.error("Track is not an audio track");
              return;
            }
            
            console.log('✅ Track type:', remoteTrack.constructor.name);
            console.log('📊 Track source:', remoteTrack.source);
            console.log('🔇 Track muted:', remoteTrack.isMuted);
            
            // Use LiveKit's createAudioAnalyser - the proper way!
            const { analyser, calculateVolume, cleanup } = createAudioAnalyser(remoteTrack, {
              fftSize: 256,
              smoothingTimeConstant: 0.15,
              cloneTrack: true, // Don't clone - might interfere with track playback
            });
            
            analyserRef.current = analyser;
            audioAnalyserCleanupRef.current = cleanup;
            
            console.log('✅ Audio analyzer created successfully with LiveKit createAudioAnalyser');
            console.log('   FFT Size:', analyser.fftSize);
            console.log('   Frequency bins:', analyser.frequencyBinCount);
            
            // Test initial volume reading
            const initialVolume = calculateVolume();
            console.log('📈 Initial volume reading:', initialVolume.toFixed(3));
            
            startAnimation();
          } catch (err) {
            console.error("❌ Error initializing agent audio:", err);
            // Retry after error
            setTimeout(initAudioFromAgentTrack, 1000);
          }
        }

        function startAnimation() {
          const animate = () => {
            if (!mounted) return;

            const THREE = window.THREE;
            if (
              analyserRef.current &&
              headMeshRef.current &&
              headMeshRef.current.morphTargetDictionary
            ) {
              const dataArray = new Uint8Array(
                analyserRef.current.frequencyBinCount
              );
              analyserRef.current.getByteFrequencyData(dataArray);

              let sumVol = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sumVol += dataArray[i];
              }
              const volume = sumVol / dataArray.length;

              // DEBUG LOGS - Remove after fixing lip-sync
              // Log volume every time it crosses threshold
              if (volume >= NOISE_GATE) {
                console.log('🎤 Audio Volume:', volume.toFixed(2), '| Threshold:', NOISE_GATE, '| Speaking: TRUE');
              }
              // Also log every 5 seconds to confirm analyzer is working
              if (Date.now() % 5000 < 50 && volume < NOISE_GATE) {
                console.log('📊 Volume check (silent):', volume.toFixed(3));
              }

              const dict = headMeshRef.current.morphTargetDictionary;
              const influences = headMeshRef.current.morphTargetInfluences;
              if (!influences) {
                console.warn('❌ morphTargetInfluences is null/undefined!');
                return;
              }

              const applyBlendshape = (
                name: string,
                target: number,
                speed = 0.4
              ) => {
                if (dict[name] !== undefined) {
                  const idx = dict[name];
                  influences[idx] += (target - influences[idx]) * speed;
                }
              };

              const now = Date.now();

              if (!isBlinkingRef.current && now > nextBlinkTimeRef.current) {
                isBlinkingRef.current = true;
                blinkStartTimeRef.current = now;
              }

              if (isBlinkingRef.current) {
                const elapsed = now - blinkStartTimeRef.current;
                let blinkValue = 0;

                if (elapsed < BLINK_DURATION) {
                  blinkValue = elapsed / BLINK_DURATION;
                } else if (elapsed < BLINK_DURATION * 2) {
                  blinkValue =
                    1.0 - (elapsed - BLINK_DURATION) / BLINK_DURATION;
                } else {
                  isBlinkingRef.current = false;
                  blinkValue = 0;
                  nextBlinkTimeRef.current =
                    now + 2000 + Math.random() * 4000;
                }

                if (dict["eyeBlinkLeft"] !== undefined) {
                  influences[dict["eyeBlinkLeft"]] = blinkValue;
                }
                if (dict["eyeBlinkRight"] !== undefined) {
                  influences[dict["eyeBlinkRight"]] = blinkValue;
                }
                
                // Log blink events
                if (elapsed < BLINK_DURATION && blinkValue > 0.9) {
                  console.log('👁️ Blinking...');
                }
              }

              if (volume < NOISE_GATE) {
                // SILENT - close mouth
                SPEAKING_SHAPES.forEach((shape) =>
                  applyBlendshape(shape, 0)
                );
                applyBlendshape("viseme_sil", 0.1, 0.1);
              } else {
                // SPEAKING - animate mouth
                console.log('🗣️ SPEAKING! Volume:', volume.toFixed(2), '| Active shape:', SPEAKING_SHAPES[activeShapeIndexRef.current]);
                
                applyBlendshape("viseme_sil", 0);

                if (now - lastShapeSwapTimeRef.current > 120) {
                  let newIndex: number;
                  do {
                    newIndex = Math.floor(
                      Math.random() * SPEAKING_SHAPES.length
                    );
                  } while (
                    newIndex === activeShapeIndexRef.current
                  );

                  activeShapeIndexRef.current = newIndex;
                  lastShapeSwapTimeRef.current = now;
                }

                const intensity = Math.min((volume / 40) * 0.6, 0.6);
                console.log('  → Intensity:', intensity.toFixed(2), '| Shape index:', activeShapeIndexRef.current);

                SPEAKING_SHAPES.forEach((shape, index) => {
                  if (index === activeShapeIndexRef.current) {
                    applyBlendshape(shape, intensity);
                  } else {
                    applyBlendshape(shape, 0);
                  }
                });
              }
            }

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(
                sceneRef.current,
                cameraRef.current
              );
            }

            animationFrameRef.current = requestAnimationFrame(animate);
          };

          animate();
        }

        await initAudioFromAgentTrack();
      } catch (err) {
        if (mounted) {
          console.error("Init error:", err);
          setError("Failed to initialize avatar");
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (handleResizeRef.current) {
        window.removeEventListener("resize", handleResizeRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = rendererRef.current.domElement;
        canvas.remove();
      }

      // Cleanup LiveKit audio analyser
      if (audioAnalyserCleanupRef.current) {
        audioAnalyserCleanupRef.current().then(() => {
          console.log('🧹 Audio analyser cleaned up');
        });
      }

      // Reset initialization flag on cleanup
      agentTrackInitializedRef.current = false;
    };
  }, [isActive, modelPath]); // FIX #3: Removed agentAudioTrack dependency to prevent re-renders

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          Loading avatar...
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#ef4444",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function Avatar3D(props: Avatar3DProps) {
  if (USE_SIMLI_AVATAR && AvatarSimli) {
    return (
      <Suspense fallback={null}>
        <AvatarSimli className={props.className} isActive={props.isActive} />
      </Suspense>
    );
  }
  return <Avatar3DGLB {...props} />;
}

export default Avatar3D;
