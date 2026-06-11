using System;
using System.Collections.Generic;

namespace ProjectManagementSystem.Data.Entities;

public partial class Ticket
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public Guid? SprintId { get; set; }

    public string Subject { get; set; } = null!;

    public string? Description { get; set; }

    public decimal? Estimate { get; set; }

    public Guid? AssigneeId { get; set; }

    public string Status { get; set; } = null!;

    public int BoardOrder { get; set; }

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User? Assignee { get; set; }

    public virtual User CreatedByUser { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;

    public virtual Sprint? Sprint { get; set; }
}
