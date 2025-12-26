# 성능 부담 분석: useImageScrollAnimation

## 📊 서버 부담 (SSR/Build Time)

### 부담도: ⭐ (매우 낮음)

- **부담 없음**: `useImageScrollAnimation` 훅은 클라이언트 사이드에서만 실행됨
- Gatsby는 정적 사이트 생성(SSG)을 사용하므로 빌드 타임에 페이지 생성
- GraphQL 쿼리는 빌드 타임에 실행되지만, 이는 정상적인 Gatsby 동작
- **결론**: 서버/빌드 타임 부담 없음

---

## 💻 클라이언트 부담

### 1. 초기 로드 시 (페이지 로드)

#### ⚠️ **높은 부담 요소**

**`findScrollContainer()` 함수**
- **비용**: 🔴 매우 높음
- **작업**: 모든 DOM 요소(`document.querySelectorAll('*')`)를 순회하며 `getComputedStyle()` 호출
- **예상 시간**: 
  - 페이지에 1000개 요소가 있다면: ~100-200ms
  - 페이지에 5000개 요소가 있다면: ~500-1000ms
- **문제점**: 
  - `getComputedStyle()`은 강제 리플로우(reflow) 발생
  - 모든 요소를 순회하는 것은 O(n) 복잡도

**`initPositions()` 함수**
- **비용**: 🟡 중간
- **작업**: 모든 이미지에 대해 `getBoundingClientRect()` 호출
- **예상 시간**: 이미지 10개 기준 ~5-10ms
- **문제점**: `getBoundingClientRect()`도 리플로우 발생

**IntersectionObserver 생성**
- **비용**: 🟢 낮음
- **작업**: Observer 생성 및 모든 이미지 observe
- **예상 시간**: ~1-2ms

#### 📈 **초기 로드 총 부담**
- **이미지 10개, DOM 요소 2000개 기준**: ~150-300ms
- **이미지 20개, DOM 요소 5000개 기준**: ~600-1200ms

---

### 2. 스크롤 이벤트 시

#### ⚠️ **높은 부담 요소**

**`checkAllPositions()` 함수 (스크롤마다 실행)**
- **비용**: 🟡 중간-높음
- **작업**: 
  - `document.querySelectorAll('.markdown .gatsby-resp-image-wrapper')` 재호출
  - 모든 이미지에 대해 `getBoundingClientRect()` 호출
  - 모든 이미지에 대해 `querySelector('img')` 호출
- **예상 시간**: 이미지 10개 기준 ~3-5ms per scroll
- **문제점**:
  - `requestAnimationFrame`으로 throttling되어 있지만, 빠른 스크롤 시 누적 부담
  - `querySelectorAll`을 매번 재호출하는 것은 불필요 (캐싱 가능)
  - `getBoundingClientRect()`는 리플로우 발생

**중복 작업**
- **비용**: 🟡 중간
- **문제**: IntersectionObserver와 스크롤 이벤트가 동시에 작동하여 중복 체크 발생
- **예상 시간**: 중복 체크로 인한 추가 ~1-2ms

#### 📈 **스크롤 이벤트 총 부담**
- **이미지 10개 기준**: 스크롤당 ~4-7ms
- **빠른 스크롤 (초당 10회)**: 초당 ~40-70ms CPU 사용
- **이미지 20개 기준**: 스크롤당 ~8-14ms

---

### 3. 메모리 부담

#### 🟢 **낮은 부담**
- IntersectionObserver: 이미지당 ~1KB
- 스크롤 이벤트 리스너: ~0.1KB
- **총 메모리**: 이미지 10개 기준 ~10-15KB

---

## 🚨 주요 성능 문제점

### 1. **`findScrollContainer()` - 매우 비효율적**
```typescript
// 현재 코드: 모든 요소를 순회하며 getComputedStyle 호출
const allElements = document.querySelectorAll('*');
for (let i = 0; i < allElements.length; i++) {
  const style = window.getComputedStyle(element); // 강제 리플로우!
}
```
**개선 방안**: 
- 특정 클래스나 data 속성으로 직접 찾기
- 또는 한 번만 찾아서 캐싱

### 2. **`checkAllPositions()` - 매번 DOM 쿼리 재실행**
```typescript
// 현재 코드: 스크롤마다 재쿼리
const checkAllPositions = () => {
  const imageWrappers = document.querySelectorAll('.markdown .gatsby-resp-image-wrapper');
  // ...
};
```
**개선 방안**: 
- 초기 로드 시 한 번만 쿼리하고 캐싱
- MutationObserver로 동적 추가 감지

### 3. **중복 체크**
- IntersectionObserver와 스크롤 이벤트가 동시에 작동
- 같은 이미지를 두 번 체크하는 경우 발생

### 4. **프로덕션 console.log**
- 모든 console.log가 프로덕션에서도 실행됨
- 불필요한 문자열 연산 및 메모리 사용

---

## 📊 성능 부담 요약

### 초기 로드 (이미지 10개, DOM 2000개 기준)
- **서버**: 0ms (부담 없음)
- **클라이언트**: ~150-300ms
  - `findScrollContainer()`: ~100-200ms (가장 큰 부담)
  - `initPositions()`: ~5-10ms
  - Observer 생성: ~1-2ms
  - 기타: ~44-88ms

### 스크롤 이벤트 (이미지 10개 기준)
- **서버**: 0ms (부담 없음)
- **클라이언트**: 스크롤당 ~4-7ms
  - `checkAllPositions()`: ~3-5ms
  - 중복 체크: ~1-2ms

### 메모리
- **서버**: 0KB (부담 없음)
- **클라이언트**: ~10-15KB (이미지 10개 기준)

---

## 💡 최적화 우선순위

1. **🔴 최우선**: `findScrollContainer()` 최적화 (초기 로드 시간 단축)
2. **🟡 높음**: `checkAllPositions()`에서 DOM 쿼리 캐싱 (스크롤 성능 개선)
3. **🟡 높음**: IntersectionObserver와 스크롤 이벤트 중복 제거
4. **🟢 중간**: 프로덕션에서 console.log 제거
5. **🟢 중간**: 불필요한 `querySelector('img')` 호출 최적화

---

## 📈 예상 개선 효과

### 최적화 후 예상 성능

**초기 로드**
- 현재: ~150-300ms
- 개선 후: ~10-20ms (약 90% 개선)

**스크롤 이벤트**
- 현재: 스크롤당 ~4-7ms
- 개선 후: 스크롤당 ~1-2ms (약 70% 개선)

