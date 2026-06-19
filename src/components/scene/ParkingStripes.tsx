import { useMemo } from 'react';
import * as THREE from 'three';
import {
  STALL,
  generateParkingStalls,
  getCrossAisles,
  getDriveLaneMarkings,
  getEwDriveAisles,
} from './parkingLotLayout';

const LINE_Y = 0.039;
const LINE_MAT = new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false });
const YELLOW_MAT = new THREE.MeshBasicMaterial({ color: '#fbbf24', toneMapped: false });
const BLUE_MAT = new THREE.MeshBasicMaterial({ color: '#3b82f6', toneMapped: false });

function Line({
  args,
  position,
  rotation,
  material = LINE_MAT,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material?: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation ?? [-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={args} />
    </mesh>
  );
}

/**
 * Stall stripes for E–W rows: stop bar faces the cross-aisle (±Z),
 * sides run along X so cars read side-by-side when facing the store.
 */
export function ParkingStripes() {
  const stalls = useMemo(() => generateParkingStalls(), []);
  const driveLanes = useMemo(() => getDriveLaneMarkings(), []);
  const crossAisles = useMemo(() => getCrossAisles(), []);
  const ewDrives = useMemo(() => getEwDriveAisles(), []);

  return (
    <group>
      {ewDrives.map((drive, i) => (
        <mesh
          key={`ew-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(drive.x0 + drive.x1) / 2, LINE_Y - 0.002, drive.z]}
        >
          <planeGeometry args={[drive.x1 - drive.x0, 6.5]} />
          <meshBasicMaterial color="#525860" toneMapped={false} />
        </mesh>
      ))}

      {crossAisles.map((aisle, i) => (
        <mesh
          key={`cross-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(aisle.x0 + aisle.x1) / 2, LINE_Y - 0.001, aisle.z]}
        >
          <planeGeometry args={[aisle.x1 - aisle.x0, 5.5]} />
          <meshBasicMaterial color="#575c62" toneMapped={false} />
        </mesh>
      ))}

      {stalls.map((stall, i) => {
        const { x, z, rotation } = stall;
        const hw = STALL.width / 2;
        const hd = STALL.depth / 2;
        const isHandicap = i % 13 === 0;

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const localToWorld = (lx: number, lz: number): [number, number, number] => [
          x + lx * cos - lz * sin,
          LINE_Y,
          z + lx * sin + lz * cos,
        ];

        const rotY: [number, number, number] = [-Math.PI / 2, rotation, 0];
        const sideMat = isHandicap ? BLUE_MAT : LINE_MAT;

        const stopSign = rotation === 0 ? 1 : -1;

        return (
          <group key={stall.id}>
            <Line
              args={[STALL.width, 0.14, 1]}
              position={localToWorld(0, stopSign * (hd - 0.12))}
              rotation={rotY}
              material={YELLOW_MAT}
            />
            <Line
              args={[0.07, STALL.depth - 0.15, 1]}
              position={localToWorld(-hw + 0.04, 0)}
              rotation={rotY}
              material={sideMat}
            />
            <Line
              args={[0.07, STALL.depth - 0.15, 1]}
              position={localToWorld(hw - 0.04, 0)}
              rotation={rotY}
              material={sideMat}
            />
            <Line
              args={[STALL.width, 0.06, 1]}
              position={localToWorld(0, -stopSign * (hd - 0.08))}
              rotation={rotY}
            />
          </group>
        );
      })}

      {driveLanes.map((lane, i) => {
        const len = lane.z1 - lane.z0;
        const cz = (lane.z0 + lane.z1) / 2;
        return (
          <Line key={`ns-drive-${i}`} args={[0.12, len, 1]} position={[lane.x, LINE_Y, cz]} material={YELLOW_MAT} />
        );
      })}

      {Array.from({ length: 16 }).map((_, dash) => (
        <Line
          key={`ns-dash-${dash}`}
          args={[0.14, 2, 1]}
          position={[0, LINE_Y + 0.001, -36 + dash * 4.5]}
          material={YELLOW_MAT}
        />
      ))}
    </group>
  );
}
