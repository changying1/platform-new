<template>
  <div class="ptz-control">
    <h3>云台控制</h3>
    
    <!-- 方向控制 -->
    <div class="direction-pad">
      <div class="row">
        <button @click="movePTZ('up')">↑ 上</button>
      </div>
      <div class="row">
        <button @click="movePTZ('left')">← 左</button>
        <button class="center">●</button>
        <button @click="movePTZ('right')">右 →</button>
      </div>
      <div class="row">
        <button @click="movePTZ('down')">↓ 下</button>
      </div>
    </div>
    
    <!-- 速度控制 -->
    <div class="speed-control">
      <label>速度: {{ speed }}</label>
      <input v-model.number="speed" type="range" min="0.1" max="1.0" step="0.1" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    videoId: { type: Number, required: true }
  },
  data() {
    return {
      speed: 0.5
    }
  },
  methods: {
    async movePTZ(direction) {
      try {
        const response = await fetch(`/api/video/ptz/${this.videoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction,
            speed: this.speed,
            duration: 1
          })
        })
        const data = await response.json()
        console.log('PTZ 移动成功:', data)
      } catch (error) {
        console.error('PTZ 移动失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.ptz-control {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  max-width: 300px;
}

.direction-pad {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.direction-pad .row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.direction-pad button {
  width: 60px;
  height: 60px;
  font-size: 16px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  transition: all 0.2s;
}

.direction-pad button:hover {
  background: #e0e0e0;
}

.direction-pad button.center {
  background: #f0f0f0;
  cursor: default;
}

.speed-control {
  text-align: center;
}

.speed-control input {
  width: 100%;
}
</style>