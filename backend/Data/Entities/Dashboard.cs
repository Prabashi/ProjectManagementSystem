using System;
using System.Collections.Generic;

namespace ProjectManagementSystem.Data.Entities;

public partial class Dashboard
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Name { get; set; } = null!;

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User CreatedByUser { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;
}
