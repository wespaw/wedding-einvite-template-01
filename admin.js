(function () {
  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = config.url && config.anonKey && !String(config.url).includes("YOUR_");

  const authShell = document.getElementById("authShell");
  const appShell = document.getElementById("appShell");
  const authStatus = document.getElementById("authStatus");
  const authMessage = document.getElementById("authMessage");
  const saveMessage = document.getElementById("saveMessage");
  const settingsForm = document.getElementById("settingsForm");
  const galleryFields = document.getElementById("galleryFields");
  const timelineFields = document.getElementById("timelineFields");
  const paletteFields = document.getElementById("paletteFields");
  const rsvpTableBody = document.getElementById("rsvpTableBody");
  const rsvpFilter = document.getElementById("rsvpFilter");
  const rsvpSummary = document.getElementById("rsvpSummary");
  const assetUploadInput = document.getElementById("assetUploadInput");
  const assetLibraryGrid = document.getElementById("assetLibraryGrid");
  const assetMessage = document.getElementById("assetMessage");
  const musicUploadInput = document.getElementById("musicUploadInput");
  const musicUploadMessage = document.getElementById("musicUploadMessage");
  const navLinks = Array.from(document.querySelectorAll(".nav-link[data-target]"));
  const topbarTitle = document.getElementById("topbarTitle");
  const topbarDescription = document.getElementById("topbarDescription");

  const totalResponses = document.getElementById("totalResponses");
  const attendingCount = document.getElementById("attendingCount");
  const declinedCount = document.getElementById("declinedCount");
  const lastUpdatedValue = document.getElementById("lastUpdatedValue");
  const overviewRsvpList = document.getElementById("overviewRsvpList");

  const STORAGE_BUCKET = "invitation-assets";

  const defaults = {
    gallery: [
      { image_url: "", alt: "" },
      { image_url: "", alt: "" },
      { image_url: "", alt: "" }
    ],
    timeline: [
      { time: "4:30", title: "Guest Arrival", description: "Champagne welcome and soft prelude music as the evening begins." },
      { time: "5:00", title: "Ceremony", description: "A candlelit vow exchange beneath florals, glass, and velvet-red accents." },
      { time: "6:00", title: "Reception Dinner", description: "Curated dining, toasts, and an elegant evening of celebration." },
      { time: "8:30", title: "First Dance", description: "Music, dancing, and the final romantic chapter of the night." }
    ],
    dress_code_palette: [
      { label: "Velvet Red", color: "#6f132b" },
      { label: "Gold", color: "#d1ab70" },
      { label: "Ivory", color: "#f2ddd7" },
      { label: "Black Tie", color: "#2b2328" }
    ],
    section_visibility: {
      story: true,
      gallery: true,
      venue: true,
      timeline: true,
      dress_code: true,
      rsvp: true,
      music: true
    }
  };

  const state = {
    gallery: [],
    timeline: [],
    dress_code_palette: [],
    section_visibility: {}
  };

  let currentSettings = null;
  let allRsvps = [];

  const pageMeta = {
    overviewSection: {
      title: "Dashboard Overview",
      description: "Track response health, review activity, and move into the right workspace from a calmer, focused control surface."
    },
    contentSection: {
      title: "Invitation Content",
      description: "Edit the public invitation section by section, manage visibility, and keep the guest-facing experience coherent."
    },
    assetsSection: {
      title: "Asset Library",
      description: "Upload, organize, and reuse images, video, and music files stored in Supabase."
    },
    rsvpSection: {
      title: "RSVP Tracking",
      description: "Filter attendance responses, export guest data, and monitor the live reply flow."
    },
    accountSection: {
      title: "Account & Setup",
      description: "Review session status, deployment notes, and backend setup details for this invitation workspace."
    }
  };

  if (!hasConfig || !window.supabase) {
    authMessage.textContent = "Update supabase-config.js with your Supabase Project URL and publishable key first.";
    if (authStatus) {
      authStatus.textContent = "Supabase not configured";
    }
    return;
  }

  const supabaseClient = window.supabase.createClient(config.url, config.anonKey);

  function byId(id) {
    return document.getElementById(id);
  }

  function cloneItems(items) {
    return JSON.parse(JSON.stringify(items));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setMessage(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  }

  function normalizeDatetimeForInput(value) {
    if (!value) return "";
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function denormalizeDatetime(value) {
    if (!value) return null;
    return new Date(value).toISOString();
  }

  function setActiveSection(targetId) {
    navLinks.forEach((button) => {
      const isActive = button.dataset.target === targetId;
      button.classList.toggle("is-active", isActive);
    });

    document.querySelectorAll("[id$='Section']").forEach((section) => {
      section.classList.toggle("hidden", section.id !== targetId);
    });

    const meta = pageMeta[targetId];
    if (meta) {
      if (topbarTitle) topbarTitle.textContent = meta.title;
      if (topbarDescription) topbarDescription.textContent = meta.description;
    }
  }

  function updateOverviewStats(rsvps, settings) {
    const rows = Array.isArray(rsvps) ? rsvps : [];
    totalResponses.textContent = String(rows.length);
    attendingCount.textContent = String(rows.filter((row) => row.attendance === "attending").length);
    declinedCount.textContent = String(rows.filter((row) => row.attendance === "declined").length);
    lastUpdatedValue.textContent = settings?.updated_at ? formatDateTime(settings.updated_at) : "-";
  }

  function renderRsvps(rows) {
    if (!rows || rows.length === 0) {
      rsvpTableBody.innerHTML = '<tr><td colspan="6" class="empty">No RSVP submissions yet.</td></tr>';
      if (rsvpSummary) {
        rsvpSummary.textContent = "No responses match the current filter.";
      }
      return;
    }

    if (rsvpSummary) {
      const filterLabel = rsvpFilter?.value === "attending"
        ? "Attending"
        : rsvpFilter?.value === "declined"
          ? "Not attending"
          : "All";
      rsvpSummary.textContent = `${filterLabel}: ${rows.length} response${rows.length === 1 ? "" : "s"}.`;
    }

    rsvpTableBody.innerHTML = rows.map((row) => {
      const tagClass = row.attendance === "attending" ? "attending" : "declined";
      return `
        <tr>
          <td>${escapeHtml(row.name || "")}</td>
          <td>${escapeHtml(row.email || "")}</td>
          <td><span class="tag ${tagClass}">${escapeHtml(row.attendance || "")}</span></td>
          <td>${escapeHtml(row.guests || 1)}</td>
          <td>${escapeHtml(row.message || "")}</td>
          <td>${formatDateTime(row.created_at)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderOverviewRsvps(rows) {
    if (!overviewRsvpList) {
      return;
    }

    const latestRows = Array.isArray(rows) ? rows.slice(0, 5) : [];
    if (!latestRows.length) {
      overviewRsvpList.innerHTML = '<div class="empty">No RSVP submissions yet.</div>';
      return;
    }

    overviewRsvpList.innerHTML = latestRows.map((row) => {
      const tagClass = row.attendance === "attending" ? "attending" : "declined";
      const message = row.message ? escapeHtml(row.message) : "No message left.";
      return `
        <article class="overview-rsvp-item">
          <div class="overview-rsvp-top">
            <strong class="overview-rsvp-name">${escapeHtml(row.name || "Guest")}</strong>
            <span class="tag ${tagClass}">${escapeHtml(row.attendance || "")}</span>
          </div>
          <div class="overview-rsvp-meta">
            <span>${escapeHtml(row.email || "No email")}</span>
            <span>${escapeHtml(row.guests || 1)} guest${Number(row.guests || 1) === 1 ? "" : "s"}</span>
            <span>${formatDateTime(row.created_at)}</span>
          </div>
          <div class="overview-rsvp-message">${message}</div>
        </article>
      `;
    }).join("");
  }

  function getFilteredRsvps(rows) {
    const filter = rsvpFilter?.value || "all";
    if (filter === "attending") {
      return rows.filter((row) => row.attendance === "attending");
    }
    if (filter === "declined") {
      return rows.filter((row) => row.attendance === "declined");
    }
    return rows;
  }

  function escapeCsv(value) {
    const text = String(value ?? "");
    if (text.includes('"') || text.includes(",") || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  }

  function exportRsvps() {
    const rows = getFilteredRsvps(allRsvps);
    if (!rows.length) {
      if (rsvpSummary) {
        rsvpSummary.textContent = "There are no RSVP rows to export for the current filter.";
      }
      return;
    }

    const header = ["Name", "Email", "Status", "Guests", "Message", "Submitted"];
    const lines = rows.map((row) => [
      row.name,
      row.email,
      row.attendance,
      row.guests,
      row.message,
      formatDateTime(row.created_at)
    ].map(escapeCsv).join(","));

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rsvps-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getAssetPublicUrl(path) {
    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  function renderAssetLibrary(items) {
    if (!items || items.length === 0) {
      assetLibraryGrid.innerHTML = '<div class="empty">No uploaded assets yet.</div>';
      return;
    }

    assetLibraryGrid.innerHTML = items.map((item) => {
      const publicUrl = getAssetPublicUrl(item.name);
      const type = item.metadata?.mimetype || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");
      const isAudio = type.startsWith("audio/");
      const preview = isImage
        ? `<img src="${escapeHtml(publicUrl)}" alt="${escapeHtml(item.name)}" />`
        : isVideo
          ? `<video src="${escapeHtml(publicUrl)}" muted playsinline></video>`
          : isAudio
            ? "Audio"
            : "File";

      return `
        <article class="asset-card">
          <div class="asset-preview">${preview}</div>
          <div class="asset-meta">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(type || "Unknown file type")}</span>
            <span>${item.updated_at ? formatDateTime(item.updated_at) : ""}</span>
          </div>
          <div class="asset-actions">
            <button class="secondary-button" type="button" data-asset-action="copy" data-path="${escapeHtml(item.name)}" data-url="${escapeHtml(publicUrl)}">Copy URL</button>
            ${isAudio ? `<button class="secondary-button" type="button" data-asset-action="use-music" data-path="${escapeHtml(item.name)}" data-url="${escapeHtml(publicUrl)}">Use as Music</button>` : ""}
            <button class="secondary-button" type="button" data-asset-action="delete" data-path="${escapeHtml(item.name)}">Delete</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderVisibilityToggles() {
    const toggleMap = {
      story: byId("storyVisibleToggle"),
      gallery: byId("galleryVisibleToggle"),
      venue: byId("venueVisibleToggle"),
      timeline: byId("timelineVisibleToggle"),
      dress_code: byId("dressCodeVisibleToggle"),
      rsvp: byId("rsvpVisibleToggle"),
      music: byId("musicVisibleToggle")
    };

    Object.entries(toggleMap).forEach(([key, element]) => {
      if (element) {
        element.checked = state.section_visibility[key] !== false;
      }
    });
  }

  function renderGalleryFields() {
    if (!state.gallery.length) {
      galleryFields.innerHTML = '<div class="empty">No gallery items yet. Upload images or add a manual row.</div>';
      return;
    }

    galleryFields.innerHTML = state.gallery.map((item, index) => `
      <div class="repeatable-item">
        <div class="repeatable-header">
          <strong>Photo ${index + 1}</strong>
          <button class="mini-button" type="button" data-remove-array="gallery" data-index="${index}">Remove</button>
        </div>
        <label class="upload-dropzone gallery-card-dropzone" data-gallery-index="${index}">
          <input type="file" accept="image/*" data-gallery-upload="${index}" />
          ${item.image_url
            ? `<div class="asset-preview"><img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt || `Gallery photo ${index + 1}`)}" /></div><strong>Drop or click to replace photo</strong>`
            : `<strong>Drop photo here</strong><span>or click to upload an image for this gallery card.</span>`}
        </label>
        <div class="field">
          <label>Image URL</label>
          <input type="url" data-array="gallery" data-index="${index}" data-key="image_url" value="${escapeHtml(item.image_url || "")}" placeholder="https://..." />
        </div>
        <div class="field">
          <label>Alt Text</label>
          <input data-array="gallery" data-index="${index}" data-key="alt" value="${escapeHtml(item.alt || "")}" placeholder="Describe the photo" />
        </div>
      </div>
    `).join("");
  }

  function renderTimelineFields() {
    if (!state.timeline.length) {
      timelineFields.innerHTML = '<div class="empty">No timeline items yet. Add one to begin.</div>';
      return;
    }

    timelineFields.innerHTML = state.timeline.map((item, index) => `
      <div class="repeatable-item">
        <div class="repeatable-header">
          <strong>Moment ${index + 1}</strong>
          <button class="mini-button" type="button" data-remove-array="timeline" data-index="${index}">Remove</button>
        </div>
        <div class="grid">
          <div class="field">
            <label>Time</label>
            <input data-array="timeline" data-index="${index}" data-key="time" value="${escapeHtml(item.time || "")}" placeholder="5:00" />
          </div>
          <div class="field">
            <label>Title</label>
            <input data-array="timeline" data-index="${index}" data-key="title" value="${escapeHtml(item.title || "")}" placeholder="Ceremony" />
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea data-array="timeline" data-index="${index}" data-key="description" placeholder="Describe this part of the celebration">${escapeHtml(item.description || "")}</textarea>
        </div>
      </div>
    `).join("");
  }

  function renderPaletteFields() {
    if (!state.dress_code_palette.length) {
      paletteFields.innerHTML = '<div class="empty">No dress code colors yet. Add one to begin.</div>';
      return;
    }

    paletteFields.innerHTML = state.dress_code_palette.map((item, index) => `
      <div class="repeatable-item">
        <div class="repeatable-header">
          <strong>Dress Code Color ${index + 1}</strong>
          <button class="mini-button" type="button" data-remove-array="dress_code_palette" data-index="${index}">Remove</button>
        </div>
        <div class="grid">
          <div class="field">
            <label>Label</label>
            <input data-array="dress_code_palette" data-index="${index}" data-key="label" value="${escapeHtml(item.label || "")}" placeholder="Velvet Red" />
          </div>
          <div class="field">
            <label>Color</label>
            <input type="color" data-array="dress_code_palette" data-index="${index}" data-key="color" value="${escapeHtml(item.color || "#d1ab70")}" />
          </div>
        </div>
      </div>
    `).join("");
  }

  function renderDynamicFields() {
    renderVisibilityToggles();
    renderGalleryFields();
    renderTimelineFields();
    renderPaletteFields();
  }

  function normalizeGalleryItems(items) {
    return Array.isArray(items) && items.length ? cloneItems(items) : cloneItems(defaults.gallery);
  }

  function normalizeTimelineItems(items) {
    return Array.isArray(items) && items.length ? cloneItems(items) : cloneItems(defaults.timeline);
  }

  function normalizePaletteItems(items) {
    return Array.isArray(items) && items.length ? cloneItems(items) : cloneItems(defaults.dress_code_palette);
  }

  function normalizeVisibility(value) {
    return { ...defaults.section_visibility, ...(value || {}) };
  }

  async function loadSettings() {
    const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
    if (error) {
      setMessage(saveMessage, error.message);
      return null;
    }

    byId("coupleNames").value = data.couple_names || "";
    byId("heroDateLineInput").value = data.hero_date_line || "";
    byId("heroVenueLineInput").value = data.hero_venue_line || "";
    byId("weddingDatetime").value = normalizeDatetimeForInput(data.wedding_datetime);
    byId("backgroundMusicUrlInput").value = data.background_music_url || "";
    byId("storyKickerInput").value = data.story_kicker || "";
    byId("storyTitleInput").value = data.story_title || "";
    byId("storyParagraphOneInput").value = data.story_paragraph_one || "";
    byId("storyParagraphTwoInput").value = data.story_paragraph_two || "";
    byId("storyQuoteInput").value = data.story_quote || "";
    byId("venueNameInput").value = data.venue_name || "";
    byId("venueAddressInput").value = data.venue_address || "";
    byId("mapEmbedUrl").value = data.map_embed_url || "";
    byId("mapLinkUrl").value = data.map_link_url || "";
    byId("dressCodeTitleInput").value = data.dress_code_title || "";
    byId("dressCodeTextInput").value = data.dress_code_text || "";

    state.gallery = normalizeGalleryItems(data.gallery);
    state.timeline = normalizeTimelineItems(data.timeline);
    state.dress_code_palette = normalizePaletteItems(data.dress_code_palette);
    state.section_visibility = normalizeVisibility(data.section_visibility);
    renderDynamicFields();

    currentSettings = data;
    return data;
  }

  async function loadRsvps() {
    const { data, error } = await supabaseClient.from("rsvps").select("*").order("created_at", { ascending: false });
    if (error) {
      rsvpTableBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
      allRsvps = [];
      return [];
    }

    allRsvps = data || [];
    renderOverviewRsvps(allRsvps);
    const filteredRows = getFilteredRsvps(allRsvps);
    renderRsvps(filteredRows);
    return allRsvps;
  }

  async function loadAssets() {
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).list("", {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" }
    });

    if (error) {
      setMessage(assetMessage, error.message);
      return [];
    }

    const files = (data || []).filter((item) => item.id);
    renderAssetLibrary(files);
    return files;
  }

  async function refreshDashboardData() {
    const [settings, rsvps] = await Promise.all([
      loadSettings(),
      loadRsvps(),
      loadAssets()
    ]);
    updateOverviewStats(rsvps, settings);
  }

  function updateArrayField(arrayName, index, key, value) {
    const target = state[arrayName];
    if (!Array.isArray(target) || !target[index]) {
      return;
    }
    target[index][key] = value;
  }

  function removeArrayItem(arrayName, index) {
    if (!Array.isArray(state[arrayName])) {
      return;
    }
    state[arrayName].splice(index, 1);
    renderDynamicFields();
  }

  function addGalleryItem() {
    state.gallery.push({ image_url: "", alt: "" });
    renderGalleryFields();
  }

  function addTimelineItem() {
    state.timeline.push({ time: "", title: "", description: "" });
    renderTimelineFields();
  }

  function addDressColorItem() {
    state.dress_code_palette.push({ label: "", color: "#d1ab70" });
    renderPaletteFields();
  }

  async function uploadFilesToBucket(files) {
    const uploadedUrls = [];

    for (const file of files) {
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(safeName, file, {
        cacheControl: "3600",
        upsert: false
      });

      if (error) {
        throw error;
      }

      uploadedUrls.push(getAssetPublicUrl(safeName));
    }

    return uploadedUrls;
  }

  async function uploadAssets() {
    const files = Array.from(assetUploadInput.files || []);
    if (!files.length) {
      setMessage(assetMessage, "Choose at least one file first.");
      return;
    }

    setMessage(assetMessage, "Uploading assets...");

    try {
      await uploadFilesToBucket(files);
      assetUploadInput.value = "";
      setMessage(assetMessage, "Assets uploaded successfully.");
      await loadAssets();
    } catch (error) {
      setMessage(assetMessage, error.message || "Unable to upload assets.");
    }
  }

  async function uploadMusic() {
    const file = musicUploadInput?.files?.[0];
    if (!file) {
      setMessage(musicUploadMessage, "Choose an audio file first.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setMessage(musicUploadMessage, "Please choose a valid audio file.");
      return;
    }

    setMessage(musicUploadMessage, "Uploading music...");

    try {
      const [url] = await uploadFilesToBucket([file]);
      byId("backgroundMusicUrlInput").value = url || "";
      musicUploadInput.value = "";
      await loadAssets();
      setMessage(musicUploadMessage, "Music uploaded. Save changes to publish it on the frontend.");
    } catch (error) {
      setMessage(musicUploadMessage, error.message || "Unable to upload music.");
    }
  }

  async function uploadGalleryImages(files, startIndex = state.gallery.length) {
    if (!files.length) {
      setMessage(saveMessage, "Choose one or more gallery images first.");
      return;
    }

    setMessage(saveMessage, "Uploading gallery images...");

    try {
      const urls = await uploadFilesToBucket(files);
      urls.forEach((url, index) => {
        const file = files[index];
        const alt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        const targetIndex = startIndex + index;
        if (state.gallery[targetIndex]) {
          state.gallery[targetIndex].image_url = url;
          if (!state.gallery[targetIndex].alt) {
            state.gallery[targetIndex].alt = alt;
          }
        } else {
          state.gallery.push({ image_url: url, alt });
        }
      });
      renderGalleryFields();
      await loadAssets();
      setMessage(saveMessage, "Gallery images uploaded. Save changes to publish them on the frontend.");
    } catch (error) {
      setMessage(saveMessage, error.message || "Unable to upload gallery images.");
    }
  }

  function buildPayload() {
    return {
      id: 1,
      couple_names: byId("coupleNames").value.trim(),
      hero_date_line: byId("heroDateLineInput").value.trim(),
      hero_venue_line: byId("heroVenueLineInput").value.trim(),
      wedding_datetime: denormalizeDatetime(byId("weddingDatetime").value),
      background_music_url: byId("backgroundMusicUrlInput").value.trim(),
      story_kicker: byId("storyKickerInput").value.trim(),
      story_title: byId("storyTitleInput").value.trim(),
      story_paragraph_one: byId("storyParagraphOneInput").value.trim(),
      story_paragraph_two: byId("storyParagraphTwoInput").value.trim(),
      story_quote: byId("storyQuoteInput").value.trim(),
      venue_name: byId("venueNameInput").value.trim(),
      venue_address: byId("venueAddressInput").value.trim(),
      map_embed_url: byId("mapEmbedUrl").value.trim(),
      map_link_url: byId("mapLinkUrl").value.trim(),
      dress_code_title: byId("dressCodeTitleInput").value.trim(),
      dress_code_text: byId("dressCodeTextInput").value.trim(),
      gallery: state.gallery.filter((item) => item.image_url && item.image_url.trim()),
      timeline: state.timeline.filter((item) => item.time || item.title || item.description),
      dress_code_palette: state.dress_code_palette.filter((item) => item.label || item.color),
      section_visibility: normalizeVisibility(state.section_visibility),
      updated_at: new Date().toISOString()
    };
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage(saveMessage, "Saving changes...");

    const payload = buildPayload();
    const { error } = await supabaseClient.from("site_settings").upsert(payload);

    if (error) {
      setMessage(saveMessage, error.message);
      return;
    }

    currentSettings = payload;
    setMessage(saveMessage, "Changes saved successfully.");
    updateOverviewStats(await loadRsvps(), payload);
  }

  async function deleteAsset(path) {
    const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).remove([path]);
    setMessage(assetMessage, error ? error.message : "Asset deleted.");
    if (!error) {
      await loadAssets();
    }
  }

  async function useAssetAsMusic(url) {
    byId("backgroundMusicUrlInput").value = url;
    const payload = {
      ...(currentSettings || { id: 1 }),
      ...buildPayload(),
      background_music_url: url,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from("site_settings").upsert(payload);
    setMessage(assetMessage, error ? error.message : "Background music updated.");
    if (!error) {
      currentSettings = payload;
      lastUpdatedValue.textContent = formatDateTime(payload.updated_at);
    }
  }

  async function updateAuthUI() {
    const { data } = await supabaseClient.auth.getSession();
    const isLoggedIn = Boolean(data.session);
    authShell.classList.toggle("hidden", isLoggedIn);
    appShell.classList.toggle("hidden", !isLoggedIn);
    if (authStatus) {
      authStatus.textContent = isLoggedIn ? data.session.user.email : "Not signed in";
    }

    if (isLoggedIn) {
      await refreshDashboardData();
      setActiveSection("overviewSection");
    }
  }

  async function login() {
    setMessage(authMessage, "Signing in...");
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: byId("loginEmail").value.trim(),
      password: byId("loginPassword").value
    });
    setMessage(authMessage, error ? error.message : "Signed in.");
    await updateAuthUI();
  }

  async function logout() {
    await supabaseClient.auth.signOut();
    setMessage(authMessage, "Signed out.");
    await updateAuthUI();
  }

  byId("loginButton").addEventListener("click", login);
  byId("logoutButton").addEventListener("click", logout);
  byId("refreshDashboardButton").addEventListener("click", refreshDashboardData);
  byId("uploadAssetsButton").addEventListener("click", uploadAssets);
  byId("uploadMusicButton").addEventListener("click", uploadMusic);
  byId("refreshAssetsButton").addEventListener("click", loadAssets);
  byId("addGalleryItemButton").addEventListener("click", addGalleryItem);
  byId("addTimelineItemButton").addEventListener("click", addTimelineItem);
  byId("addDressColorButton").addEventListener("click", addDressColorItem);
  byId("exportRsvpsButton").addEventListener("click", exportRsvps);
  settingsForm.addEventListener("submit", saveSettings);

  if (rsvpFilter) {
    rsvpFilter.addEventListener("change", () => {
      renderRsvps(getFilteredRsvps(allRsvps));
    });
  }

  navLinks.forEach((button) => {
    button.addEventListener("click", () => setActiveSection(button.dataset.target));
  });

  [galleryFields, timelineFields, paletteFields].forEach((container) => {
    container.addEventListener("input", (event) => {
      const field = event.target.closest("[data-array]");
      if (!field) {
        return;
      }

      const arrayName = field.dataset.array;
      const index = Number(field.dataset.index);
      const key = field.dataset.key;
      updateArrayField(arrayName, index, key, field.value);
    });

    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-array]");
      if (!button) {
        return;
      }

      removeArrayItem(button.dataset.removeArray, Number(button.dataset.index));
    });
  });

  galleryFields.addEventListener("change", async (event) => {
    const input = event.target.closest("[data-gallery-upload]");
    if (!input) {
      return;
    }

    const files = Array.from(input.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      return;
    }

    await uploadGalleryImages(files.slice(0, 1), Number(input.dataset.galleryUpload));
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    galleryFields.addEventListener(eventName, (event) => {
      const zone = event.target.closest(".gallery-card-dropzone");
      if (!zone) {
        return;
      }

      event.preventDefault();
      zone.classList.add("is-dragging");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    galleryFields.addEventListener(eventName, (event) => {
      const zone = event.target.closest(".gallery-card-dropzone");
      if (!zone) {
        return;
      }

      zone.classList.remove("is-dragging");
    });
  });

  galleryFields.addEventListener("drop", async (event) => {
    const zone = event.target.closest(".gallery-card-dropzone");
    if (!zone) {
      return;
    }

    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setMessage(saveMessage, "Drop image files here to add them to the gallery.");
      return;
    }

    await uploadGalleryImages(files.slice(0, 1), Number(zone.dataset.galleryIndex));
  });

  [
    ["storyVisibleToggle", "story"],
    ["galleryVisibleToggle", "gallery"],
    ["venueVisibleToggle", "venue"],
    ["timelineVisibleToggle", "timeline"],
    ["dressCodeVisibleToggle", "dress_code"],
    ["rsvpVisibleToggle", "rsvp"],
    ["musicVisibleToggle", "music"]
  ].forEach(([id, key]) => {
    const toggle = byId(id);
    if (!toggle) {
      return;
    }

    toggle.addEventListener("change", () => {
      state.section_visibility[key] = toggle.checked;
    });
  });

  assetLibraryGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-asset-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.assetAction;
    const path = button.dataset.path;
    const url = button.dataset.url;

    if (action === "copy" && url) {
      await navigator.clipboard.writeText(url);
      setMessage(assetMessage, "Public URL copied.");
      return;
    }

    if (action === "use-music" && url) {
      await useAssetAsMusic(url);
      return;
    }

    if (action === "delete" && path) {
      await deleteAsset(path);
    }
  });

  supabaseClient.auth.onAuthStateChange(() => {
    updateAuthUI();
  });

  updateAuthUI();
})();
