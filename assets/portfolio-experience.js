(() => {
  "use strict";

  function capturePortfolio(eventName, properties = {}) {
    try {
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(eventName, properties);
      }
    } catch (_error) {
      // Analytics must never interrupt the portfolio experience.
    }
  }

  document.querySelectorAll(".portfolio-experience-section").forEach((section) => {
    const version = section.dataset.portfolioVersion || "v1.0";
    const lifecycle = section.querySelector(".px-lifecycle");
    const lifecycleScroll = section.querySelector(".px-lifecycle-scroll");
    const stageCount = section.querySelector("[data-portfolio-stage-count]");
    const status = section.querySelector("[data-portfolio-status]");
    const stageTabs = [...section.querySelectorAll("[data-portfolio-stage]")];
    const stagePanels = [...section.querySelectorAll("[data-portfolio-stage-panel]")];
    const nextStageButtons = [...section.querySelectorAll("[data-portfolio-next-stage]")];
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const activeArtefactTitle = (panel) => {
      const active = panel?.querySelector(".px-artefact-tab.is-active");
      return active ? active.textContent.trim() : "";
    };

    const centreStageOnMobile = (tab) => {
      if (!lifecycleScroll || lifecycleScroll.scrollWidth <= lifecycleScroll.clientWidth) return;
      const targetLeft = tab.offsetLeft - (lifecycleScroll.clientWidth - tab.offsetWidth) / 2;
      lifecycleScroll.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    const selectStage = (nextTab, { announce = true, track = true } = {}) => {
      const index = stageTabs.indexOf(nextTab);
      if (index < 0) return;
      const stageId = nextTab.dataset.portfolioStage;
      const nextPanel = stagePanels.find((panel) => panel.dataset.portfolioStagePanel === stageId);

      stageTabs.forEach((tab) => {
        const selected = tab === nextTab;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const cue = tab.querySelector(".px-stage-current");
        if (cue) cue.textContent = selected ? "Current stage" : "";
      });
      stagePanels.forEach((panel) => {
        const selected = panel === nextPanel;
        panel.hidden = !selected;
        panel.classList.toggle("is-active", selected);
      });

      if (lifecycle) {
        const progress = stageTabs.length > 1 ? (index / (stageTabs.length - 1)) * 100 : 0;
        lifecycle.style.setProperty("--portfolio-progress", `${progress}%`);
      }
      if (stageCount) stageCount.textContent = `Stage ${index + 1} of ${stageTabs.length}`;
      centreStageOnMobile(nextTab);

      if (announce && status && nextPanel) {
        const artefact = activeArtefactTitle(nextPanel);
        status.textContent = `${nextTab.textContent.replace("Current stage", "").trim()} selected.${artefact ? ` ${artefact} preview shown.` : ""}`;
      }
      if (track) {
        capturePortfolio("portfolio_lifecycle_stage_selected", {
          project: "salesforce_crm",
          stage: stageId,
          portfolio_version: version,
        });
      }
    };

    stageTabs.forEach((tab) => {
      tab.addEventListener("click", () => selectStage(tab));
      tab.addEventListener("keydown", (event) => {
        const currentIndex = stageTabs.indexOf(tab);
        let nextIndex = currentIndex;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % stageTabs.length;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + stageTabs.length) % stageTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = stageTabs.length - 1;
        if (nextIndex === currentIndex && !["Home", "End"].includes(event.key)) return;
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        stageTabs[nextIndex].focus();
        selectStage(stageTabs[nextIndex]);
      });
    });

    nextStageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextTab = stageTabs.find((tab) => tab.dataset.portfolioStage === button.dataset.portfolioNextStage);
        if (!nextTab) return;
        const nextPanel = stagePanels.find((panel) => panel.dataset.portfolioStagePanel === nextTab.dataset.portfolioStage);
        selectStage(nextTab);
        if (!nextPanel) return;
        window.requestAnimationFrame(() => {
          nextPanel.scrollIntoView({
            block: "start",
            behavior: reduceMotion ? "auto" : "smooth",
          });
          nextPanel.focus({ preventScroll: true });
        });
      });
    });

    stagePanels.forEach((stagePanel) => {
      const artefactTabs = [...stagePanel.querySelectorAll("[data-portfolio-artefact]")];
      const artefactPanels = [...stagePanel.querySelectorAll("[data-portfolio-artefact-panel]")];
      artefactTabs.forEach((button) => {
        button.addEventListener("click", () => {
          const artefactIndex = button.dataset.portfolioArtefact;
          artefactTabs.forEach((tab) => {
            const selected = tab === button;
            tab.classList.toggle("is-active", selected);
            tab.setAttribute("aria-pressed", String(selected));
          });
          artefactPanels.forEach((panel) => {
            const selected = panel.dataset.portfolioArtefactPanel === artefactIndex;
            panel.hidden = !selected;
            panel.classList.toggle("is-active", selected);
          });
          if (status) {
            const stageTitle = stagePanel.querySelector("h4")?.textContent.trim() || "Portfolio stage";
            status.textContent = `${stageTitle}: ${button.textContent.trim()} preview shown.`;
          }
        });
      });
    });

    section.querySelectorAll("[data-portfolio-secondary]").forEach((button) => {
      button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        const reveal = document.getElementById(button.getAttribute("aria-controls"));
        button.setAttribute("aria-expanded", String(!isOpen));
        if (reveal) reveal.hidden = isOpen;
        if (!isOpen) {
          capturePortfolio("portfolio_secondary_project_selected", {
            project: button.dataset.portfolioSecondary,
            portfolio_version: version,
          });
        }
      });
    });

    section.querySelector("[data-portfolio-cta]")?.addEventListener("click", () => {
      capturePortfolio("portfolio_cta_clicked", {
        project: "salesforce_crm",
        portfolio_version: version,
      });
    });

    let sectionViewCaptured = false;
    const captureSectionView = () => {
      if (sectionViewCaptured) return;
      sectionViewCaptured = true;
      capturePortfolio("portfolio_section_viewed", {
        project: "salesforce_crm",
        portfolio_version: version,
      });
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          captureSectionView();
          observer.disconnect();
        }
      }, { threshold: 0.2 });
      observer.observe(section);
    } else {
      captureSectionView();
    }

    if (stageTabs[0]) selectStage(stageTabs[0], { announce: false, track: false });
  });
})();
