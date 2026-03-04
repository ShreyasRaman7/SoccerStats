import React from "react";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Badge, Button, Progress,
  Input, InputGroup, InputGroupAddon,
} from "reactstrap";

const STATUS_COLOR   = { posted: "success", scheduled: "primary", pending: "secondary", approved: "info", rejected: "danger" };
const PLATFORM_COLOR = { tiktok: "danger", instagram: "warning", youtube: "info" };

function ClipQueue() {
  const [clips,  setClips]  = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const loadClips = React.useCallback(() => {
    fetch("/api/clips").then((r) => r.json()).then(setClips).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadClips();
    const t = setInterval(loadClips, 5000);
    return () => clearInterval(t);
  }, [loadClips]);

  const handleApprove = (clipId) => {
    fetch(`/api/clips/${clipId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "approved" }),
    }).then(loadClips);
  };

  const handleReject = (clipId) => {
    fetch(`/api/clips/${clipId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "rejected" }),
    }).then(loadClips);
  };

  const handleSchedule = (clipId, platform) => {
    fetch("/api/schedule", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clip_id: clipId, platform }),
    }).then(loadClips);
  };

  const filtered = clips.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = !search
      || c.job_title?.toLowerCase().includes(search.toLowerCase())
      || c.caption?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    posted:    clips.filter((c) => c.status === "posted").length,
    scheduled: clips.filter((c) => c.status === "scheduled").length,
    pending:   clips.filter((c) => c.status === "pending").length,
  };
  const avgScore = clips.length
    ? Math.round(clips.reduce((a, c) => a + c.viral_score, 0) / clips.length)
    : 0;

  return (
    <>
      <div className="content">
        <Row>
          {[
            { label: "Posted",    value: counts.posted,    icon: "icon-check-2",   cls: "icon-success" },
            { label: "Scheduled", value: counts.scheduled, icon: "icon-time-alarm", cls: "icon-primary" },
            { label: "Pending",   value: counts.pending,   icon: "icon-refresh-02", cls: "icon-warning" },
            { label: "Avg Score", value: `${avgScore}%`,   icon: "icon-trophy",    cls: "icon-info" },
          ].map((s) => (
            <Col lg="3" md="6" key={s.label}>
              <Card className="card-stats">
                <CardBody>
                  <Row>
                    <Col xs="5">
                      <div className={`info-icon text-center ${s.cls}`}><i className={`tim-icons ${s.icon}`} /></div>
                    </Col>
                    <Col xs="7">
                      <div className="numbers">
                        <p className="card-category">{s.label}</p>
                        <CardTitle tag="h3">{s.value}</CardTitle>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <Row className="align-items-center">
                  <Col md="4"><CardTitle tag="h4">Clip Queue</CardTitle></Col>
                  <Col md="4">
                    <InputGroup>
                      <Input
                        placeholder="Search clips..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ background: "#1d1f33", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      />
                      <InputGroupAddon addonType="append">
                        <Button color="secondary" size="sm"><i className="tim-icons icon-zoom-split" /></Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Col>
                  <Col md="4" className="text-right">
                    {["all", "pending", "posted", "scheduled"].map((f) => (
                      <Button key={f} size="sm" className="mr-1"
                        color={filter === f ? "info" : "secondary"}
                        onClick={() => setFilter(f)}
                        style={{ textTransform: "capitalize" }}>
                        {f}
                      </Button>
                    ))}
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                {filtered.length === 0 ? (
                  <p style={{ color: "#9a9a9a", textAlign: "center", padding: "2rem 0" }}>
                    {clips.length === 0
                      ? "No clips yet — submit a YouTube link on the Dashboard."
                      : "No clips match your filter."}
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table tablesorter">
                      <thead className="text-primary">
                        <tr>
                          <th>ID</th>
                          <th>Source</th>
                          <th>Clip Time</th>
                          <th>Caption</th>
                          <th>Face Track</th>
                          <th>Status</th>
                          <th>Platforms</th>
                          <th className="text-center">Score</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((clip) => (
                          <tr key={clip.id}>
                            <td style={{ fontFamily: "monospace", color: "#9a9a9a", fontSize: "0.8rem" }}>#{clip.id}</td>
                            <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {clip.job_title || `Job #${clip.job_id}`}
                            </td>
                            <td style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                              {fmtTime(clip.start_time)} – {fmtTime(clip.end_time)}
                              <br /><small style={{ color: "#666" }}>{clip.duration?.toFixed(0)}s</small>
                            </td>
                            <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                              {clip.caption || "—"}
                            </td>
                            <td className="text-center">
                              {clip.face_tracked
                                ? <i className="tim-icons icon-check-2 text-success" />
                                : <i className="tim-icons icon-simple-remove text-muted" />}
                            </td>
                            <td>
                              <Badge color={STATUS_COLOR[clip.status] || "secondary"} pill>
                                {clip.status?.charAt(0).toUpperCase() + clip.status?.slice(1)}
                              </Badge>
                            </td>
                            <td>
                              {clip.platforms?.length > 0
                                ? clip.platforms.map((p) => (
                                    <Badge key={p} color={PLATFORM_COLOR[p.toLowerCase()] || "secondary"} pill className="mr-1" style={{ fontSize: "0.7rem" }}>
                                      {p}
                                    </Badge>
                                  ))
                                : <span style={{ color: "#666", fontSize: "0.8rem" }}>—</span>}
                            </td>
                            <td className="text-center">
                              <span style={{ color: clip.viral_score >= 90 ? "#00d6b4" : clip.viral_score >= 75 ? "#1f8ef1" : "#ff8d72", fontWeight: 700 }}>
                                {clip.viral_score?.toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right">
                              {clip.status === "pending" && (
                                <>
                                  <Button color="success" size="sm" className="mr-1" onClick={() => handleSchedule(clip.id, "tiktok")}>TK</Button>
                                  <Button color="warning" size="sm" className="mr-1" onClick={() => handleSchedule(clip.id, "instagram")}>IG</Button>
                                  <Button color="info"    size="sm" className="mr-1" onClick={() => handleSchedule(clip.id, "youtube")}>YT</Button>
                                  <Button color="danger"  size="sm" onClick={() => handleReject(clip.id)}>✕</Button>
                                </>
                              )}
                              {clip.file_path && (
                                <a href={clip.file_path} target="_blank" rel="noopener noreferrer">
                                  <Button color="link" size="sm"><i className="tim-icons icon-triangle-right-17" /></Button>
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Pipeline stages */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Processing Pipeline</CardTitle>
                <p className="card-category">How every clip is made</p>
              </CardHeader>
              <CardBody>
                <Row>
                  {[
                    { step: "1. Download", icon: "icon-cloud-download-93", color: "text-info",    desc: "yt-dlp fetches the video",             val: 100 },
                    { step: "2. AI Score", icon: "icon-bulb-63",           color: "text-warning", desc: "Whisper transcribes + scores moments",  val: 65 },
                    { step: "3. Crop 9:16", icon: "icon-single-02",        color: "text-success", desc: "Face-tracked crop to vertical format",  val: 40 },
                    { step: "4. Post",      icon: "icon-send",             color: "text-primary", desc: "Auto-scheduled to all platforms",       val: 20 },
                  ].map((p) => (
                    <Col md="3" key={p.step}>
                      <div className="text-center p-3" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
                        <i className={`tim-icons ${p.icon} ${p.color}`} style={{ fontSize: "2rem" }} />
                        <p className="mt-2 mb-1" style={{ color: "#fff", fontWeight: 600 }}>{p.step}</p>
                        <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>{p.desc}</p>
                        <Progress value={p.val} style={{ height: 4 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default ClipQueue;
