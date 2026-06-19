/** Shared outdoor ground + NPC vertical alignment (asphalt top ≈ 0.04). */
export const OUTDOOR_GROUND_Y = 0.04;

/** ShopperAvatar leg mesh bottom in local space. */
export const SHOPPER_FOOT_LOCAL_Y = 0.17;

const NPC_COLLIDER_HEIGHT = 1.05;

/** RigidBody center Y so collider bottom sits on asphalt. */
export const NPC_BODY_CENTER_Y = OUTDOOR_GROUND_Y + NPC_COLLIDER_HEIGHT / 2;

/** Offset avatar mesh so feet touch asphalt when body is at NPC_BODY_CENTER_Y. */
export const SHOPPER_AVATAR_Y_OFFSET = OUTDOOR_GROUND_Y - NPC_BODY_CENTER_Y - SHOPPER_FOOT_LOCAL_Y;
