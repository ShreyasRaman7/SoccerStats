import React from "react";
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col, Badge, Button, Input, FormGroup, Label,
} from "reactstrap";

const PLATFORM_COLOR = { tiktok: "danger", instagram: "warning", youtube: "info" };
const STATUS_COLOR   = { posted: "success", pending: "primary", failed: "danger" };

function Schedule() {
  const [posts,       setPosts]       = React.useState([]);
  const [autoSched,   setAutoSched]   = React.useState(true);
  const [postsPerDay, setPostsPerDay] = React.useState("3");
  const [tiktok,      setTiktok]      = React.useState(true);
  const [instagram,   setInstagram]   = React.useState(true);
  const [youtube,     setYoutube]     = React.useState(true);

  const loadPosts = React.useCallback(() => {
    fetch("/api/schedule").then((r) => r.json()).then(setPosts).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadPosts();
    const t = setInterval(loadPosts, 10000);
    return () => clearInterval(t);
  }, [loadPosts]);

  const handleDelete = (id) => {
    fetch(`/api/schedule/${id}`, { method: "DELETE" }).then(loadPosts);
  };

  const liveCount      = posts.filter((p) => p.status === "posted").length;
  const scheduledCount = posts.filter((p) => p.status === "pending").length;
  const thisWeek       = posts.length;
  const platforms      = new Set(posts.map((p) => p.platform)).size;

  return (
    <>
      <div className="content">
        <Row>
          {[
            { label: "Live Today",      value: liveCount,      icon: "icon-check-2",    cls: "icon-success" },
            { label: "Scheduled",       value: scheduledCount, icon: "icon-time-alarm", cls: "icon-primary" },
            { label: "This Week",       value: thisWeek,       icon: "icon-calendar-60", cls: "icon-warning" },
            { label: "Platforms Active", value: platforms || 0, icon: "icon-send",       cls: "icon-info" },
          ].map((s) => (
            <Col lg="3" md="6" key={s.label}>
              <Card className="card-stats">
                <CardBody>
                  <Row>
                    <Col xs="5"><div className={`info-icon text-center ${s.cls}`}><i className={`tim-icons ${s.icon}`} /></div></Col>
                    <Col xs="7"><div className="numbers"><p className="card-category">{s.label}</p><CardTitle tag="h3">{s.value}</CardTitle></div></Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        <Row>
          {/* Posts table */}
          <Col lg="8">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Scheduled Posts</CardTitle>
                <p className="card-category">Auto-refreshes every 10s</p>
              </CardHeader>
              <CardBody>
                {posts.length === 0 ? (
                  <p style={{ color: "#9a9a9a", textAlign: "center", padding: "2rem 0" }}>
                    No scheduled posts yet. Approve clips in the Clip Queue to schedule them.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table tablesorter">
                      <thead className="text-primary">
                        <tr>
                          <th>Time</th>
                          <th>Platform</th>
                          <th>Caption</th>
                          <th>Status</th>
                          <th className="text-center">Views</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr key={post.id}>
                            <td style={{ color: "#9a9a9a", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                              {post.scheduled_at
                                ? new Date(post.scheduled_at).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })
                                : "TBD"}
                            </td>
                            <td>
                              <Badge color={PLATFORM_COLOR[post.platform?.toLowerCase()] || "secondary"} pill>
                                {post.platform}
                              </Badge>
                            </td>
                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                              {post.caption || post.clip_caption || "—"}
                            </td>
                            <td>
                              <Badge color={STATUS_COLOR[post.status] || "secondary"} pill>
                                {post.status?.charAt(0).toUpperCase() + post.status?.slice(1)}
                              </Badge>
                            </td>
                            <td className="text-center" style={{ fontWeight: 600 }}>
                              {post.views > 0 ? post.views.toLocaleString() : "—"}
                            </td>
                            <td className="text-right">
                              {post.post_url && (
                                <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                                  <Button color="link" size="sm"><i className="tim-icons icon-link-72" /></Button>
                                </a>
                              )}
                              {post.status === "pending" && (
                                <Button color="link" size="sm" style={{ color: "#ff6b6b" }} onClick={() => handleDelete(post.id)}>
                                  <i className="tim-icons icon-simple-remove" />
                                </Button>
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

          {/* Settings */}
          <Col lg="4">
            <Card>
              <CardHeader><CardTitle tag="h4">Auto-Schedule Settings</CardTitle></CardHeader>
              <CardBody>
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Label style={{ color: "#fff", marginBottom: 0 }}>Auto-Schedule</Label>
                    <Button size="sm" color={autoSched ? "success" : "secondary"} onClick={() => setAutoSched(!autoSched)}>
                      {autoSched ? "ON" : "OFF"}
                    </Button>
                  </div>
                  <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>
                    Agent picks best posting times based on platform analytics.
                  </p>
                </FormGroup>
                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                <FormGroup>
                  <Label style={{ color: "#fff" }}>Posts Per Day</Label>
                  <Input type="select" value={postsPerDay} onChange={(e) => setPostsPerDay(e.target.value)}
                    style={{ background: "#1d1f33", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    <option value="1">1 post / day</option>
                    <option value="2">2 posts / day</option>
                    <option value="3">3 posts / day</option>
                    <option value="5">5 posts / day</option>
                  </Input>
                </FormGroup>
                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                <Label style={{ color: "#fff", marginBottom: 10, display: "block" }}>Active Platforms</Label>
                {[
                  { name: "TikTok",    val: tiktok,    set: setTiktok,    badge: "danger"  },
                  { name: "Instagram", val: instagram,  set: setInstagram, badge: "warning" },
                  { name: "YouTube",   val: youtube,    set: setYoutube,   badge: "info"    },
                ].map((pl) => (
                  <div key={pl.name} className="d-flex justify-content-between align-items-center mb-3">
                    <span style={{ color: "#9a9a9a" }}>
                      <Badge color={pl.badge} pill className="mr-2">{pl.name.slice(0, 2).toUpperCase()}</Badge>
                      {pl.name}
                    </span>
                    <Button size="sm" color={pl.val ? "success" : "secondary"} onClick={() => pl.set(!pl.val)}>
                      {pl.val ? "ON" : "OFF"}
                    </Button>
                  </div>
                ))}
                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                <Button color="info" block><i className="tim-icons icon-check-2 mr-1" /> Save Settings</Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Schedule;
