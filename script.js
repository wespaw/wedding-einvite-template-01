const intro = document.getElementById('intro');
const envelopeButton = document.getElementById('envelopeButton');
const invitation = document.getElementById('invitation');

const countdownMessage = document.getElementById('countdownMessage');
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

const weddingDate = new Date('2026-08-15T16:30:00+08:00');

function animateEnvelopeFlyIn() {
  if (window.gsap && window.MotionPathPlugin) {
    window.gsap.registerPlugin(window.MotionPathPlugin);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const startX = -width * 1.15;
    const startY = height * 0.2;
    const control1X = -width * 0.92;
    const control1Y = -height * 0.58;
    const control2X = -width * 0.42;
    const control2Y = -height * 0.24;
    const endX = 0;
    const endY = 0;

    const curvePath = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;

    const tl = window.gsap.timeline({
      defaults: { ease: 'power2.inOut' }
    });

    window.gsap.set(envelopeButton, {
      x: startX,
      y: startY,
      rotation: -32,
      scale: 0.58,
      transformOrigin: '50% 50%'
    });

    tl.to(envelopeButton, {
      duration: 2.3,
      motionPath: {
        path: curvePath,
        start: 0,
        end: 1,
        autoRotate: false
      },
      rotation: -2,
      scale: 1,
      ease: 'power2.inOut'
    });

    tl.add(() => {
      window.gsap.to(envelopeButton, {
        y: 10,
        duration: 2.1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    });

    return;
  }

  envelopeButton.classList.add('fly-in-fallback');
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function updateCountdown() {
  const now = new Date();
  const distance = weddingDate.getTime() - now.getTime();

  if (distance <= 0) {
    daysEl.textContent = '00';
    hoursEl.textContent = '00';
    minutesEl.textContent = '00';
    secondsEl.textContent = '00';
    countdownMessage.textContent = 'Today is the day. We cannot wait to celebrate with you!';
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  daysEl.textContent = padNumber(days);
  hoursEl.textContent = padNumber(hours);
  minutesEl.textContent = padNumber(minutes);
  secondsEl.textContent = padNumber(seconds);
}

function openInvitation() {
  intro.classList.add('opening');

  setTimeout(() => {
    intro.classList.add('hidden');
    invitation.classList.remove('hidden');

    requestAnimationFrame(() => {
      invitation.classList.add('show');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, 900);
}

envelopeButton.addEventListener('click', openInvitation);

envelopeButton.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openInvitation();
  }
});

animateEnvelopeFlyIn();

updateCountdown();
setInterval(updateCountdown, 1000);

const rsvpForm = document.getElementById('rsvpForm');
const formStatus = document.getElementById('formStatus');

rsvpForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!rsvpForm.checkValidity()) {
    formStatus.textContent = 'Please complete all required fields.';
    return;
  }

  const formData = new FormData(rsvpForm);
  const payload = Object.fromEntries(formData.entries());
  console.log('RSVP submitted', payload);

  formStatus.textContent = 'Thank you! Your RSVP has been received.';
  rsvpForm.reset();
});
