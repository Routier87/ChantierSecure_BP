import { system, ItemStack } from "@minecraft/server";

const CARD_ID = "chantier:carte_ouvrier";
const BLOCK_ID = "chantier:coffre_securise";

// Cooldown simple par joueur et par bloc
const cooldowns = new Map();

/**
 * Renvoie une clé unique pour le cooldown de ce bloc et ce joueur
 */
function makeCooldownKey(player, block) {
  const loc = block.location;
  return `${player.id}:${loc.x},${loc.y},${loc.z}`;
}

/**
 * Vérifie si le joueur possède la carte ouvrier
 */
function playerHasWorkerCard(player) {
  const inventoryComp = player.getComponent("minecraft:inventory");
  const container = inventoryComp?.container;
  if (!container) return false;

  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === CARD_ID) {
      return true;
    }
  }

  return false;
}

/**
 * Donne le contenu du coffre sécurisé
 */
function giveSecureChestLoot(player) {
  const inventoryComp = player.getComponent("minecraft:inventory");
  const container = inventoryComp?.container;
  if (!container) return;

  const rewards = [
    new ItemStack("minecraft:iron_pickaxe", 1),
    new ItemStack("minecraft:bread", 8),
    new ItemStack("minecraft:torch", 16),
    new ItemStack("minecraft:oak_planks", 32)
  ];

  for (const item of rewards) {
    container.addItem(item);
  }
}

system.beforeEvents.startup.subscribe((initEvent) => {
  initEvent.blockComponentRegistry.registerCustomComponent("chantier:secure_crate", {
    onPlayerInteract(event) {
      const player = event.player;
      const block = event.block;

      if (!player || !block || block.typeId !== BLOCK_ID) return;

      const cooldownKey = makeCooldownKey(player, block);
      const now = system.currentTick;
      const nextAllowedTick = cooldowns.get(cooldownKey) ?? 0;

      if (now < nextAllowedTick) {
        const secondsLeft = Math.ceil((nextAllowedTick - now) / 20);
        player.sendMessage(`§eCoffre en recharge: ${secondsLeft}s`);
        return;
      }

      if (!playerHasWorkerCard(player)) {
        player.sendMessage("§cAccès refusé : Carte Ouvrier requise.");
        try {
          player.runCommand("playsound note.bass @s");
        } catch (e) {}
        return;
      }

      giveSecureChestLoot(player);
      cooldowns.set(cooldownKey, now + 20 * 10); // 10 secondes
      player.sendMessage("§aAccès autorisé : matériel récupéré.");
      try {
        player.runCommand("playsound random.chestopen @s");
      } catch (e) {}
    }
  });
});
