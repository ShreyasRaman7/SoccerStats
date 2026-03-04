import React from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Badge,
  Button,
  Progress,
  Input,
  InputGroup,
  InputGroupAddon,
} from "reactstrap";

const allClips = [
  {
    id: "CLIP-001",
    job: "JOB-001",
    source: "Top 10 Goals of the Season",
    start: "0:32",
    end: "0:58",
    duration: "26s",
    viralScore: 96,
    caption: "Insane volley from 35 yards 🔥 #football #goals",
    faceTracked: true,
    status: "posted",
    platforms: ["TikTok", "Instagram"],
    views: "142K",
  },
  {
    id: "CLIP-002",
    job: "JOB-001",
    source: "Top 10 Goals of the Season",
    start: "2:14",
    end: "2:45",
    duration: "31s",
    viralScore: 93,
    caption: "He just walked past 4 defenders like they weren't there 😤",
    faceTracked: true,
    status: "posted",
    platforms: ["TikTok", "YouTube"],
    views: "98K",
  },
  {
    id: "CLIP-003",
    job: "JOB-002",
    source: "Ronaldo Skills Compilation",
    start: "1:05",
    end: "1:32",
    duration: "27s",
    viralScore: 91,
    caption: "CR7 elastico that broke the internet 💫 #Ronaldo",
    faceTracked: true,
    status: "captioning",
    platforms: [],
    views: "—",
  },
  {
    id: "CLIP-004",
    job: "JOB-002",
    source: "Ronaldo Skills Compilation",
    start: "3:42",
    end: "4:09",
    duration: "27s",
    viralScore: 87,
    caption: "The step-over king never misses 👑",
    faceTracked: false,
    status: "processing",
    platforms: [],
    views: "—",
  },
  {
    id: "CLIP-005",
    job: "JOB-003",
    source: "Best Saves 2024",
    start: "0:18",
    end: "0:44",
    duration: "26s",
    viralScore: 94,
    caption: "That reflex save should be illegal 🧤 #goalkeeper",
    faceTracked: true,
    status: "scheduled",
    platforms: ["TikTok"],
    views: "—",
  },
  {
    id: "CLIP-006",
    job: "JOB-004",
    source: "Messi Dribbles Masterclass",
    start: "0:55",
    end: "1:25",
    duration: "30s",
    viralScore: 98,
    caption: "Nobody does it like Leo. NOBODY. 🐐 #Messi",
    faceTracked: true,
    status: "posted",
    platforms: ["TikTok", "Instagram", "YouTube"],
    views: "310K",
  },
];

const statusColor = {
  posted: "success",
  scheduled: "primary",
  captioning: "warning",
  processing: "info",
};

const platformColor = {
  TikTok: "danger",
  Instagram: "warning",
  YouTube: "info",
};

function ClipQueue() {
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const filtered = allClips.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch =
      !search ||
      c.source.toLowerCase().includes(search.toLowerCase()) ||
      c.caption.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <>
      <div className="content">
        {/* Summary cards */}
        <Row>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-success">
                      <i className="tim-icons icon-check-2" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Posted</p>
                      <CardTitle tag="h3">
                        {allClips.filter((c) => c.status === "posted").length}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-primary">
                      <i className="tim-icons icon-time-alarm" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Scheduled</p>
                      <CardTitle tag="h3">
                        {allClips.filter((c) => c.status === "scheduled").length}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-warning">
                      <i className="tim-icons icon-refresh-02" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Processing</p>
                      <CardTitle tag="h3">
                        {allClips.filter((c) => c.status === "processing" || c.status === "captioning").length}
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-info">
                      <i className="tim-icons icon-trophy" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Avg Viral Score</p>
                      <CardTitle tag="h3">
                        {Math.round(allClips.reduce((a, c) => a + c.viralScore, 0) / allClips.length)}%
                      </CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Filters + table */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <Row className="align-items-center">
                  <Col md="5">
                    <CardTitle tag="h4">Clip Queue</CardTitle>
                  </Col>
                  <Col md="4">
                    <InputGroup>
                      <Input
                        placeholder="Search clips..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ background: "#1d1f33", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      />
                      <InputGroupAddon addonType="append">
                        <Button color="secondary" size="sm">
                          <i className="tim-icons icon-zoom-split" />
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Col>
                  <Col md="3" className="text-right">
                    <Button
                      size="sm"
                      color={filter === "all" ? "info" : "secondary"}
                      onClick={() => setFilter("all")}
                      className="mr-1"
                    >All</Button>
                    <Button
                      size="sm"
                      color={filter === "posted" ? "success" : "secondary"}
                      onClick={() => setFilter("posted")}
                      className="mr-1"
                    >Posted</Button>
                    <Button
                      size="sm"
                      color={filter === "scheduled" ? "primary" : "secondary"}
                      onClick={() => setFilter("scheduled")}
                    >Scheduled</Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table tablesorter">
                    <thead className="text-primary">
                      <tr>
                        <th>Clip ID</th>
                        <th>Source Video</th>
                        <th>Clip Time</th>
                        <th>Caption Preview</th>
                        <th>Face Track</th>
                        <th>Status</th>
                        <th>Platforms</th>
                        <th className="text-center">Viral Score</th>
                        <th className="text-center">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((clip) => (
                        <tr key={clip.id}>
                          <td style={{ fontFamily: "monospace", color: "#9a9a9a", fontSize: "0.8rem" }}>
                            {clip.id}
                          </td>
                          <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {clip.source}
                          </td>
                          <td style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                            {clip.start} – {clip.end}
                            <br />
                            <small style={{ color: "#666" }}>{clip.duration}</small>
                          </td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                            {clip.caption}
                          </td>
                          <td className="text-center">
                            {clip.faceTracked ? (
                              <i className="tim-icons icon-check-2 text-success" />
                            ) : (
                              <i className="tim-icons icon-simple-remove text-muted" />
                            )}
                          </td>
                          <td>
                            <Badge color={statusColor[clip.status]} pill>
                              {clip.status.charAt(0).toUpperCase() + clip.status.slice(1)}
                            </Badge>
                          </td>
                          <td>
                            {clip.platforms.length > 0 ? (
                              clip.platforms.map((p) => (
                                <Badge key={p} color={platformColor[p]} pill className="mr-1" style={{ fontSize: "0.7rem" }}>
                                  {p}
                                </Badge>
                              ))
                            ) : (
                              <span style={{ color: "#666", fontSize: "0.8rem" }}>—</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span
                              style={{
                                color: clip.viralScore >= 93 ? "#00d6b4" : clip.viralScore >= 85 ? "#1f8ef1" : "#ff8d72",
                                fontWeight: 700,
                              }}
                            >
                              {clip.viralScore}%
                            </span>
                          </td>
                          <td className="text-center" style={{ fontWeight: 600 }}>
                            {clip.views}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="text-center py-4" style={{ color: "#9a9a9a" }}>
                    No clips match your filter.
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Processing pipeline */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Active Pipeline</CardTitle>
                <p className="card-category">Real-time clip processing stages</p>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md="3">
                    <div className="text-center p-3" style={{ border: "1px solid rgba(29,140,248,0.3)", borderRadius: 8 }}>
                      <i className="tim-icons icon-cloud-download-93 text-info" style={{ fontSize: "2rem" }} />
                      <p className="mt-2 mb-1" style={{ color: "#fff", fontWeight: 600 }}>1. Download</p>
                      <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>Fetch YouTube video via yt-dlp</p>
                      <Progress value={100} color="info" style={{ height: 4 }} />
                    </div>
                  </Col>
                  <Col md="3">
                    <div className="text-center p-3" style={{ border: "1px solid rgba(255,141,114,0.3)", borderRadius: 8 }}>
                      <i className="tim-icons icon-bulb-63 text-warning" style={{ fontSize: "2rem" }} />
                      <p className="mt-2 mb-1" style={{ color: "#fff", fontWeight: 600 }}>2. AI Analysis</p>
                      <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>Detect viral moments & score clips</p>
                      <Progress value={65} color="warning" style={{ height: 4 }} />
                    </div>
                  </Col>
                  <Col md="3">
                    <div className="text-center p-3" style={{ border: "1px solid rgba(0,214,180,0.3)", borderRadius: 8 }}>
                      <i className="tim-icons icon-single-02 text-success" style={{ fontSize: "2rem" }} />
                      <p className="mt-2 mb-1" style={{ color: "#fff", fontWeight: 600 }}>3. Face Track & Crop</p>
                      <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>Auto-crop to 9:16 with face tracking</p>
                      <Progress value={40} color="success" style={{ height: 4 }} />
                    </div>
                  </Col>
                  <Col md="3">
                    <div className="text-center p-3" style={{ border: "1px solid rgba(100,100,255,0.3)", borderRadius: 8 }}>
                      <i className="tim-icons icon-send text-primary" style={{ fontSize: "2rem" }} />
                      <p className="mt-2 mb-1" style={{ color: "#fff", fontWeight: 600 }}>4. Caption & Post</p>
                      <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>Add captions & schedule to platforms</p>
                      <Progress value={20} color="primary" style={{ height: 4 }} />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default ClipQueue;
