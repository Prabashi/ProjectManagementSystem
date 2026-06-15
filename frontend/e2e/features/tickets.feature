Feature: Ticket Management

  Scenario: User creates a new ticket
    Given I am logged in as an admin
    And a project "Ticket Test Project" exists
    When I go to the project page for "Ticket Test Project"
    And I click the "Tickets" tab
    And I click "New ticket"
    And I fill in "Subject" with "Fix the login bug"
    And I click "create ticket"
    Then I should see "Fix the login bug" in the page
