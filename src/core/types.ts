export type VehicleType = 'bike' | 'vf5';
export type VehicleLocation = 'floor' | 'wash' | 'charger' | 'export' | 'carried' | 'exported';
export type VehicleState = 'raw' | 'washing' | 'clean' | 'charging' | 'charged' | 'overcharged' | 'loaded' | 'exported';
export type StationType = 'intake' | 'wash' | 'charger' | 'conveyor' | 'export';
export type EntityKind = 'customer' | 'goods';
export type EntityTier = 'normal' | 'vip';
export type VehicleReq = 'car' | 'bike';

export interface VehicleDef {
  type: VehicleType;
  label: string;
  color: number;
  basePoints: number;
  speedFactor: number;
  req: VehicleReq;
}

export interface LevelDef {
  id: string;
  label: string;
  durationSec: number;
  stations: Array<{ type: StationType; x: number; z: number }>;
}
